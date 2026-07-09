import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useImportHouseholdBackup } from './useHouseholdBackup';
import { householdBackupService } from '@/features/household-backup/services/household-backup.service';
import { useAuth } from '@/providers/AuthProvider';

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/household-backup/services/household-backup.service', () => ({
  householdBackupService: {
    importHouseholdBackup: jest.fn(),
  },
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedBackupService = jest.mocked(householdBackupService);

function createWrapper(queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false, gcTime: Infinity },
  },
})) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const backup = {
  schemaVersion: 1,
  household: { name: 'Imported household' },
} as any;

describe('useImportHouseholdBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects imports when the user is signed out', async () => {
    mockedUseAuth.mockReturnValue({
      profile: null,
      refreshSession: jest.fn(),
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const { result, unmount } = await renderHook(() => useImportHouseholdBackup(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(backup)).rejects.toThrow(
      'You must be signed in to import a household backup.',
    );
    expect(mockedBackupService.importHouseholdBackup).not.toHaveBeenCalled();
    await unmount();
    queryClient.clear();
  });

  it('imports with the current user and refreshes the session after success', async () => {
    const refreshSession = jest.fn();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockedUseAuth.mockReturnValue({
      profile: { id: 'user-1' },
      refreshSession,
    } as any);
    mockedBackupService.importHouseholdBackup.mockResolvedValue({
      householdId: 'household-1',
      summary: { transactions: 2 },
    } as any);

    const { result, unmount } = await renderHook(() => useImportHouseholdBackup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(backup);
    });

    expect(mockedBackupService.importHouseholdBackup).toHaveBeenCalledWith(backup, 'user-1');
    expect(refreshSession).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    await unmount();
    queryClient.clear();
  });
});
