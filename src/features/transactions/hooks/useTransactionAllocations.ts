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

/**
 * Allocation rows for many transactions at once (one round trip, no N+1) --
 * e.g. to work out which slices of a batch of split transactions were
 * funded from pots. Keyed under "transactions" so invalidateHouseholdData
 * (which every transaction/allocation write already calls) refreshes it.
 */
export function useTransactionAllocationsForTransactions(
  transactionIds: readonly string[],
  options?: { enabled?: boolean },
) {
  const sortedIds = [...transactionIds].sort();
  return useQuery({
    queryKey: ["transactions", "allocations", sortedIds],
    queryFn: () => transactionAllocationsService.getForTransactions(sortedIds),
    enabled: (options?.enabled ?? true) && sortedIds.length > 0,
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
