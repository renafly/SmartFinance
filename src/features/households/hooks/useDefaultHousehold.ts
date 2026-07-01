import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useSession } from "@/shared/session";

export function useMyHouseholds() {
  const { data: session, isPending: sessionLoading } = useSession();
  const userId = session?.profile.id;

  return useQuery({
    queryKey: ["my-households", userId],
    queryFn: () => householdsService.getMyHouseholds(userId!),
    enabled: !!userId && !sessionLoading,
  });
}

export function useSetDefaultHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (householdId: string) =>
      householdsService.setDefaultHousehold(householdId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
