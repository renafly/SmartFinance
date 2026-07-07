import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";

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
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      void refreshSession();
    },
  });
}

export function useDefaultHousehold() {
  return useSetDefaultHousehold();
}
