import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profilesService } from '../services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';
import type { AppLanguage } from '@/shared/i18n/languages';
import { invalidateHouseholdData } from '@/lib/query-invalidation';

export function useUpdateLocale() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({ profileId, locale }: { profileId: string; locale: AppLanguage }) =>
      profilesService.updateLocale(profileId, locale),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
