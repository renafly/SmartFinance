import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import { transactionAllocationsService } from "../services/transaction-allocations.service";
import type { AllocationDraft } from "../utils/transaction-allocations";
import type { SaveTransactionFundingInput } from "@/repositories/transaction-allocations.repository";

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

/** Saves an expense's split of the effective cost and its reimbursements
 * together (save_transaction_funding) -- invalidates everything the
 * separate allocation and reimbursement writes used to. */
export function useSaveTransactionFunding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveTransactionFundingInput) => transactionAllocationsService.saveFunding(input),
    onSuccess: (_data, variables) => {
      invalidateHouseholdData(queryClient);
      queryClient.invalidateQueries({ queryKey: ["transaction-allocations", variables.transactionId] });
      queryClient.invalidateQueries({ queryKey: ["transaction-reimbursements", variables.transactionId] });
      queryClient.invalidateQueries({ queryKey: ["transaction-effective-amount", variables.transactionId] });
      queryClient.invalidateQueries({ queryKey: ["reimbursement-income-link"] });
    },
  });
}
