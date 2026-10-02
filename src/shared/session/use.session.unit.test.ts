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

  it('refreshes the same user silently without clearing mounted content', async () => {
    const initialState = {
      profile: { id: 'user-1', full_name: 'Ana' },
      householdId: 'household-1',
    };
    mockLoadProfileAndHousehold.mockResolvedValueOnce(initialState);

    const claims = { sub: 'user-1' };
    const hook = await renderHook<SessionState, { refreshKey: number }>(
      ({ refreshKey }) => useSession(claims, refreshKey),
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

  it('blocks content when the authenticated user changes', async () => {
    mockLoadProfileAndHousehold
      .mockResolvedValueOnce({
        profile: { id: 'user-1' },
        householdId: 'household-1',
      })
      .mockReturnValueOnce(new Promise(() => {}));

    const hook = await renderHook<
      SessionState,
      { claims: { sub: string } }
    >(
      ({ claims }) => useSession(claims, 0),
      { initialProps: { claims: { sub: 'user-1' } } },
    );

    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    await hook.rerender({ claims: { sub: 'user-2' } });

    await waitFor(() => expect(hook.result.current.loading).toBe(true));
  });

  it('never reports a loaded, household-less state for a freshly signed-in user before their data loads', async () => {
    // Signed out first: loads to { householdId: null, loading: false }.
    mockLoadProfileAndHousehold.mockResolvedValueOnce({ profile: null, householdId: null });

    const hook = await renderHook<SessionState, { claims: { sub: string } | null }>(
      ({ claims }) => useSession(claims, 0),
      { initialProps: { claims: null } },
    );

    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    const login = deferred<{ profile: { id: string }; householdId: string }>();
    mockLoadProfileAndHousehold.mockReturnValueOnce(login.promise);

    await hook.rerender({ claims: { sub: 'user-1' } });

    // The very first render with the new claims must already be "loading",
    // otherwise the Protected gate sees householdId === null and latches the
    // setup wizard for a user who already has a household.
    expect(hook.result.current).toMatchObject({ loading: true, householdId: null });

    await act(async () => {
      login.resolve({ profile: { id: 'user-1' }, householdId: 'household-1' });
      await login.promise;
    });

    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: 'household-1', error: false }),
    );
  });

  it('flags a failed load as an error rather than as "no household"', async () => {
    mockLoadProfileAndHousehold.mockRejectedValueOnce(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Hoisted so the claims keep a stable identity across renders: an inline
    // object literal would re-trigger the [claims] effect on every render and
    // loop forever (which used to OOM the Jest worker).
    const claims = { sub: 'user-1' };
    const hook = await renderHook(() => useSession(claims, 0));

    await waitFor(() =>
      expect(hook.result.current).toMatchObject({ loading: false, householdId: null, error: true }),
    );
  });
});
