import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transaction.service";

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.updateTransaction,

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