import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profilesService } from '../services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';
import type { ThemeMode } from '@/stores/themeStore';
import { invalidateHouseholdData } from '@/lib/query-invalidation';

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({ profileId, theme }: { profileId: string; theme: ThemeMode }) =>
      profilesService.updateTheme(profileId, theme),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
