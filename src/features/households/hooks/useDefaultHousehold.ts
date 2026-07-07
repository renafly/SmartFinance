import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useMyHouseholds() {
  const { profile, isLoading } = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ["my-households", userId],
    queryFn: () => householdsService.getMyHouseholds(userId!),
    enabled: !!userId && !isLoading,
  });
}

export function useSetDefaultHousehold() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (householdId: string) =>
      householdsService.setDefaultHousehold(householdId),

    onSuccess: () => {
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}

export function useDefaultHousehold() {
  return useSetDefaultHousehold();
}
