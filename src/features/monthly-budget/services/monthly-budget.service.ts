import { monthlyBudgetRepository, type BudgetRuleWithAllocations } from "@/repositories/monthly-budget.repository";
import type { Database } from "@/types/database.types";

type BudgetConfig = Database["public"]["Tables"]["budget_configs"]["Row"];
type BudgetRule = BudgetRuleWithAllocations;
type MonthlyBudgetRun = Database["public"]["Tables"]["monthly_budget_runs"]["Row"];

export type MonthlyBudgetWorkspace = {
  config: BudgetConfig | null;
  rules: BudgetRule[];
  runs: MonthlyBudgetRun[];
};

/**
 * All that's left of the old Monthly Budget rule/run system after the
 * Phase 5+7 planned-items cutover (see budget.tsx's doc comment) and this
 * Phase 8 cleanup pass. Rule editing (budget-rule-card.tsx) and run
 * drafting/confirming (saveConfiguration/saveDraftRun/cancelRun/
 * confirmRun/deleteRunTransactions/getIncomeInputs, plus buildPreview)
 * were all deleted here -- nothing in the app calls them any more, since
 * the hooks that reached them (useSaveMonthlyBudgetConfiguration,
 * useSaveMonthlyBudgetDraft, useCancelMonthlyBudgetRun,
 * useConfirmMonthlyBudgetRun, useDeleteMonthlyBudgetRunTransactions,
 * useMonthlyBudgetRuns, useMonthlyBudgetIncomeInputs) had zero remaining
 * callers and were deleted from ../hooks alongside them.
 *
 * getWorkspace is the one method still reachable: useMonthlyBudgetWorkspace
 * (../hooks/index.ts) is still consumed live by the forecast feature
 * (src/features/forecast/hooks/useBalanceForecasts.ts) and saving pots
 * (src/features/saving-pots/hooks/useSavingPotForecasts.ts) to factor
 * legacy budget_rules/budget_rule_allocations and the most recent
 * confirmed monthly_budget_runs row into balance projections. That means
 * budget_configs/budget_rules/budget_rule_allocations/monthly_budget_runs
 * are write-dead (nothing creates or edits them any more) but must stay
 * readable -- and stay in the database -- until that forecast dependency
 * is itself migrated onto planned_items. See the DROP migration
 * (supabase/migrations/20260901002000_drop_legacy_monthly_budget_architecture.sql)
 * for the full caution around when these tables can actually go.
 */
export class MonthlyBudgetService {
  async getWorkspace(householdId: string): Promise<MonthlyBudgetWorkspace> {
    const [configResult, runsResult] = await Promise.all([
      monthlyBudgetRepository.getActiveConfigWithRules(householdId),
      monthlyBudgetRepository.listRuns(householdId),
    ]);

    if (configResult.error) throw configResult.error;
    if (runsResult.error) throw runsResult.error;

    return {
      config: configResult.data ?? null,
      rules: configResult.data?.rules ?? [],
      runs: runsResult.data ?? [],
    };
  }
}

export const monthlyBudgetService = new MonthlyBudgetService();
