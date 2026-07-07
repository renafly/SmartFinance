import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";

export function useUpdateHousehold() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({
      householdId,
      name,
    }: {
      householdId: string;
      name: string;
    }) => householdsService.updateHouseholdName(householdId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      void refreshSession();
    },
  });
}

export function useDeleteHousehold() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (householdId: string) =>
      householdsService.deleteHousehold(householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["saving-pots"] });
      void refreshSession();
    },
  });
}
