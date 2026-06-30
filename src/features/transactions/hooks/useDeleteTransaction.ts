import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transaction.service";

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.deleteTransaction,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["accounts"],
      });
    },
  });
}