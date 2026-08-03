import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { transactionsService } from "../services/transaction.service";

export function useBulkUpdateTransactionCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionsService.bulkUpdateCategory,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
