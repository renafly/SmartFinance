import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { transactionsService } from "../services/transaction.service";

export function useUpdateCompletedTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionsService.updateCompletedTransfer,
    onSuccess: () => invalidateHouseholdData(queryClient),
  });
}
