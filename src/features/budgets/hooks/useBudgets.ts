import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { budgetsService } from "../services/budgets.service";
import { useSession } from "@/shared/session";

export function useBudgets() {
  const { data: session, isPending: sessionLoading } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["budgets", householdId],
    queryFn: () => budgetsService.getBudgets(householdId!),
    enabled: !!householdId && !sessionLoading,
  });
}

export function useBudgetProgress() {
  const { data: session, isPending: sessionLoading } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["budget-progress", householdId],
    queryFn: () => budgetsService.getProgress(householdId!),
    enabled: !!householdId && !sessionLoading,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-progress"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-progress"] });
    },
  });
}