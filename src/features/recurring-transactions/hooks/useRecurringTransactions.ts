import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recurringTransactionsService } from "../services/recurring-transactions.service";
import { useSession } from "@/shared/session";

export function useRecurringTransactions() {
  const { data: session, isPending: sessionLoading } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["recurring-transactions", householdId],
    queryFn: () => recurringTransactionsService.getRecurringTransactions(householdId!),
    enabled: !!householdId && !sessionLoading,
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringTransactionsService.createRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}

export function useToggleRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      recurringTransactionsService.toggleRecurringTransaction(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recurringTransactionsService.deleteRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}