import { useMutation, useQueryClient } from "@tanstack/react-query";

import { transferService } from "../services/transfer.service";

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferService.createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}