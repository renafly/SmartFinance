import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profilesService } from '../services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';
import type { AppCurrency } from '@/stores/preferencesStore';

export function useUpdatePreferredCurrency() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({ profileId, currency }: { profileId: string; currency: AppCurrency }) =>
      profilesService.updatePreferredCurrency(profileId, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      void refreshSession();
    },
  });
}
