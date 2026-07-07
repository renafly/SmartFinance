import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recurringTransactionsService } from "../services/recurring-transactions.service";
import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

export function useRecurringTransactions() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["recurring-transactions", householdId],
    queryFn: () => recurringTransactionsService.getRecurringTransactions(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringTransactionsService.createRecurringTransaction,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useToggleRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      recurringTransactionsService.toggleRecurringTransaction(id, active),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringTransactionsService.deleteRecurringTransaction,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringTransactionsService.updateRecurringTransaction,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}
