import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "../services/transaction.service";

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.createTransaction,

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