import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { transactionAllocationsService } from "../services/transaction-allocations.service";
import type { AllocationDraft } from "../utils/transaction-allocations";

export function useTransactionAllocations(
  transactionId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["transaction-allocations", transactionId],
    queryFn: () => transactionAllocationsService.getForTransaction(transactionId!),
    enabled: (options?.enabled ?? true) && !!transactionId,
  });
}

export function useSaveTransactionAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      totalAmount,
      allocations,
    }: {
      transactionId: string;
      totalAmount: number;
      allocations: readonly AllocationDraft[];
    }) =>
      transactionAllocationsService.replace(transactionId, totalAmount, allocations),

    onSuccess: (_data, variables) => {
      invalidateHouseholdData(queryClient);
      queryClient.invalidateQueries({
        queryKey: ["transaction-allocations", variables.transactionId],
      });
    },
  });
}
