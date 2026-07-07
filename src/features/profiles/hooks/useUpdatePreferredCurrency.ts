import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profilesService } from '../services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';
import type { AppCurrency } from '@/stores/preferencesStore';
import { invalidateHouseholdData } from '@/lib/query-invalidation';

export function useUpdatePreferredCurrency() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({ profileId, currency }: { profileId: string; currency: AppCurrency }) =>
      profilesService.updatePreferredCurrency(profileId, currency),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
