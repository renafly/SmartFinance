import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profilesService } from '../services/profiles.service';
import { useAuth } from '@/providers/AuthProvider';
import { invalidateHouseholdData } from '@/lib/query-invalidation';

export function useUpdateFullName() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({ profileId, fullName }: { profileId: string; fullName: string }) =>
      profilesService.updateFullName(profileId, fullName),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
