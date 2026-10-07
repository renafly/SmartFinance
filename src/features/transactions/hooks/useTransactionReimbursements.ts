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

/** Every reimbursement in the household (Wage Flow nets expenses with these).
 * Keyed under "transaction-reimbursements" so invalidateHouseholdData and
 * every reimbursement mutation refresh it too. */
export function useHouseholdReimbursements(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["transaction-reimbursements", "household", householdId],
    queryFn: () => transactionReimbursementsService.listForHousehold(householdId!),
    enabled: !!householdId,
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
  // The linked income transaction changed too (balances, lists).
  queryClient.invalidateQueries({ queryKey: ["reimbursement-income-link"] });
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

/** Batch create (all-or-nothing) -- used by the create-transaction wizard. */
export function useCreateReimbursements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateReimbursementInput[]) =>
      transactionReimbursementsService.createReimbursements(inputs),
    onSuccess: (_data, variables) => {
      const transactionIds = new Set(variables.map((input) => input.transaction_id));
      for (const transactionId of transactionIds) {
        invalidateForTransaction(queryClient, transactionId);
      }
    },
  });
}

export function useUpdateReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input }: { input: UpdateReimbursementInput; transactionId: string }) =>
      transactionReimbursementsService.updateReimbursement(input),
    onSuccess: (_data, variables) => {
      invalidateForTransaction(queryClient, variables.transactionId);
    },
  });
}

/**
 * Non-null when `transactionId` is the income automatically created for an
 * account reimbursement -- the edit modal then shows it as read-only
 * money (its amount/account/date follow the reimbursement).
 */
export function useReimbursementIncomeLink(transactionId: string | null | undefined) {
  return useQuery({
    queryKey: ["reimbursement-income-link", transactionId],
    queryFn: () => transactionReimbursementsService.getIncomeLink(transactionId!),
    enabled: !!transactionId,
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
