import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { monthlyBudgetService } from "../services/monthly-budget.service";

/**
 * Read-only workspace query -- the sole survivor of the old Monthly Budget
 * rule/run hooks (rule editing and run drafting/confirming were removed
 * in the Phase 8 cleanup, see monthly-budget.service.ts's doc comment).
 * Still consumed by the forecast feature (useAccountBalanceForecasts) and
 * saving pots (useSavingPotForecasts) to factor legacy budget_rules and
 * the most recent confirmed monthly_budget_runs row into their
 * projections. Do not remove until those two callers stop reading it.
 */
export function useMonthlyBudgetWorkspace() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["monthly-budget", householdId],
    queryFn: () => monthlyBudgetService.getWorkspace(householdId!),
    enabled: !!householdId && !isLoading,
  });
}
