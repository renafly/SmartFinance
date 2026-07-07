import { useMutation, useQueryClient } from "@tanstack/react-query";

import { householdsService } from "@/features/households/services/households.service";
import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

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
      invalidateHouseholdData(queryClient);
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
      invalidateHouseholdData(queryClient);
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
      invalidateHouseholdData(queryClient);
      void refreshSession();
    },
  });
}
