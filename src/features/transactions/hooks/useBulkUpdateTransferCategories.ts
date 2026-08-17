import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { transactionsService } from "../services/transaction.service";

export function useBulkUpdateTransferCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.bulkUpdateTransferCategory,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
