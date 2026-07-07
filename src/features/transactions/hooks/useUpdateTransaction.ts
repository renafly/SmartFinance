import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transaction.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.updateTransaction,

    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
