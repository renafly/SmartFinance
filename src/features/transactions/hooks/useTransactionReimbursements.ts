import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateHouseholdData } from "@/lib/query-invalidation";
import {
  transactionReimbursementsService,
  type CreateReimbursementInput,
  type UpdateReimbursementInput,
} from "../services/transaction-reimbursements.service";

export function useTransactionReimbursements(
  transactionId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["transaction-reimbursements", transactionId],
    queryFn: () => transactionReimbursementsService.getForTransaction(transactionId!),
    enabled: (options?.enabled ?? true) && !!transactionId,
  });
}

/**
 * Bulk lookup used by the transactions list to decorate rows that have a
 * reimbursement, without a per-row request. See
 * TransactionReimbursementsRepository.listEffectiveAmountsForHousehold.
 */
export function useHouseholdEffectiveAmounts(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["transaction-effective-amounts", householdId],
    queryFn: () => transactionReimbursementsService.listEffectiveAmountsForHousehold(householdId!),
    enabled: !!householdId,
  });
}

function invalidateForTransaction(queryClient: ReturnType<typeof useQueryClient>, transactionId: string) {
  invalidateHouseholdData(queryClient);
  queryClient.invalidateQueries({ queryKey: ["transaction-reimbursements", transactionId] });
  queryClient.invalidateQueries({ queryKey: ["transaction-effective-amount", transactionId] });
}

export function useCreateReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReimbursementInput) =>
      transactionReimbursementsService.createReimbursement(input),
    onSuccess: (_data, variables) => {
      invalidateForTransaction(queryClient, variables.transaction_id);
    },
  });
}

export function useDeleteReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; transactionId: string }) =>
      transactionReimbursementsService.deleteReimbursement(id),
    onSuccess: (_data, variables) => {
      invalidateForTransaction(queryClient, variables.transactionId);
    },
  });
}
