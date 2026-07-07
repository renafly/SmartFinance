import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";

export function useTransferHouseholdOwnership() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: ({
      householdId,
      newOwnerId,
    }: {
      householdId: string;
      newOwnerId: string;
    }) => householdsService.transferOwnership(householdId, newOwnerId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      queryClient.invalidateQueries({ queryKey: ["household-member-details"] });
      void refreshSession();
    },
  });
}

export function useRemoveHouseholdMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      householdId,
      userIdToRemove,
    }: {
      householdId: string;
      userIdToRemove: string;
    }) => householdsService.removeMember(householdId, userIdToRemove),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      queryClient.invalidateQueries({ queryKey: ["household-member-details"] });
    },
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  return useMutation({
    mutationFn: (householdId: string) =>
      householdsService.leaveHousehold(householdId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-households"] });
      queryClient.invalidateQueries({ queryKey: ["household-members"] });
      queryClient.invalidateQueries({ queryKey: ["household-member-details"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      void refreshSession();
    },
  });
}
