import { act, renderHook, waitFor } from '@testing-library/react-native';

import { sessionService } from './session.service';
import type { SessionState } from './session.types';
import { useSession } from './use.session';

jest.mock('./session.service', () => ({
  sessionService: {
    loadProfileAndHousehold: jest.fn(),
  },
}));

const mockLoadProfileAndHousehold =
  sessionService.loadProfileAndHousehold as jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe('useSession', () => {
  beforeEach(() => {
    mockLoadProfileAndHousehold.mockReset();
  });

  it('loads membership for the given session user id', async () => {
    mockLoadProfileAndHousehold.mockResolvedValueOnce({
      profile: { id: 'user-1' },
      householdId: 'household-1',
    });

    const hook = await renderHook(() => useSession('user-1', 0));

    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: 'household-1', error: false }),
    );
    expect(mockLoadProfileAndHousehold).toHaveBeenCalledWith('user-1');
  });

  it('refreshes the same user silently without clearing mounted content', async () => {
    const initialState = {
      profile: { id: 'user-1', full_name: 'Ana' },
      householdId: 'household-1',
    };
    mockLoadProfileAndHousehold.mockResolvedValueOnce(initialState);

    const hook = await renderHook<SessionState, { refreshKey: number }>(
      ({ refreshKey }) => useSession('user-1', refreshKey),
      { initialProps: { refreshKey: 0 } },
    );

    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    const refresh = deferred<typeof initialState>();
    mockLoadProfileAndHousehold.mockReturnValueOnce(refresh.promise);

    await hook.rerender({ refreshKey: 1 });

    expect(hook.result.current).toMatchObject({
      ...initialState,
      loading: false,
    });

    await act(async () => {
      refresh.resolve({
        profile: { id: 'user-1', full_name: 'Ana updated' },
        householdId: 'household-1',
      });
      await refresh.promise;
    });

    await waitFor(() =>
      expect(hook.result.current.profile?.full_name).toBe('Ana updated'),
    );
  });

  it('keeps a known household when a background refresh for the same user fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLoadProfileAndHousehold
      .mockResolvedValueOnce({ profile: { id: 'user-1' }, householdId: 'household-1' })
      .mockRejectedValueOnce(new Error('network'));

    const hook = await renderHook<SessionState, { refreshKey: number }>(
      ({ refreshKey }) => useSession('user-1', refreshKey),
      { initialProps: { refreshKey: 0 } },
    );

    await waitFor(() => expect(hook.result.current.householdId).toBe('household-1'));

    await hook.rerender({ refreshKey: 1 });

    await waitFor(() => expect(mockLoadProfileAndHousehold).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: 'household-1', error: false }),
    );
  });

  it('blocks content when the authenticated user changes', async () => {
    mockLoadProfileAndHousehold
      .mockResolvedValueOnce({
        profile: { id: 'user-1' },
        householdId: 'household-1',
      })
      .mockReturnValueOnce(new Promise(() => {}));

    const hook = await renderHook<SessionState, { userId: string }>(
      ({ userId }) => useSession(userId, 0),
      { initialProps: { userId: 'user-1' } },
    );

    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    await hook.rerender({ userId: 'user-2' });

    expect(hook.result.current).toMatchObject({ loading: true, householdId: null });
  });

  it('never reports a loaded, household-less state for a freshly signed-in user before their data loads', async () => {
    // Signed out first: loads to { householdId: null, loading: false }.
    mockLoadProfileAndHousehold.mockResolvedValueOnce({ profile: null, householdId: null });

    const hook = await renderHook<SessionState, { userId: string | null }>(
      ({ userId }) => useSession(userId, 0),
      { initialProps: { userId: null } },
    );

    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    const login = deferred<{ profile: { id: string }; householdId: string }>();
    mockLoadProfileAndHousehold.mockReturnValueOnce(login.promise);

    await hook.rerender({ userId: 'user-1' });

    // The very first render with the new session user must already be
    // "loading", otherwise the dashboard would briefly offer household setup
    // to a user who already has a household.
    expect(hook.result.current).toMatchObject({ loading: true, householdId: null });

    await act(async () => {
      login.resolve({ profile: { id: 'user-1' }, householdId: 'household-1' });
      await login.promise;
    });

    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: 'household-1', error: false }),
    );
  });

  it('flags a failed initial load as an error rather than as "no household"', async () => {
    mockLoadProfileAndHousehold.mockRejectedValueOnce(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const hook = await renderHook(() => useSession('user-1', 0));

    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: null, error: true }),
    );
  });
});
