import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";
import {
  monthlyBudgetService,
  type MonthlyBudgetIncomeDraft,
  type MonthlyBudgetPreview,
  type MonthlyBudgetRuleDraft,
} from "../services/monthly-budget.service";

export function useMonthlyBudgetWorkspace() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["monthly-budget", householdId],
    queryFn: () => monthlyBudgetService.getWorkspace(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useMonthlyBudgetRuns() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["monthly-budget-runs", householdId],
    queryFn: () => monthlyBudgetService.getWorkspace(householdId!),
    select: (workspace) => workspace.runs,
    enabled: !!householdId && !isLoading,
  });
}

export function useMonthlyBudgetIncomeInputs(runId?: string | null) {
  return useQuery({
    queryKey: ["monthly-budget-income-inputs", runId],
    queryFn: () => monthlyBudgetService.getIncomeInputs(runId!),
    enabled: !!runId,
  });
}

export function useSaveMonthlyBudgetConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: monthlyBudgetService.saveConfiguration,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useSaveMonthlyBudgetDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: monthlyBudgetService.saveDraftRun,
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useCancelMonthlyBudgetRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => monthlyBudgetService.cancelRun(runId),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useConfirmMonthlyBudgetRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      runId: string;
      householdId: string;
      month: string;
      preview: MonthlyBudgetPreview;
      createdBy: string;
    }) => monthlyBudgetService.confirmRun(input),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export type {
  MonthlyBudgetIncomeDraft,
  MonthlyBudgetPreview,
  MonthlyBudgetRuleDraft,
};
