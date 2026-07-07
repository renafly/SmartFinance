import { useMutation, useQueryClient } from "@tanstack/react-query";

import { transferService } from "../services/transfer.service";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferService.createTransfer,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
