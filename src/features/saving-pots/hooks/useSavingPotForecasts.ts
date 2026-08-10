import { useMemo } from "react";

import { useMonthlyBudgetWorkspace } from "@/features/monthly-budget/hooks";
import { useRecurringTransactions } from "@/features/recurring-transactions/hooks";
import { buildSavingPotForecasts } from "../services/saving-pot-forecast.service";
import { useSavingPotAccountAssignments, useSavingPotBalances, useSavingPots } from "./useSavingPotQueries";

export function useSavingPotForecasts() {
  const savingPotsQuery = useSavingPots();
  const balancesQuery = useSavingPotBalances();
  const assignmentsQuery = useSavingPotAccountAssignments();
  const recurringQuery = useRecurringTransactions();
  const budgetWorkspaceQuery = useMonthlyBudgetWorkspace();

  return useMemo(() => {
    const balancesByPotId = new Map(
      (balancesQuery.data ?? []).map((balance: any) => [balance.id, balance]),
    );

    // budget_rules carries no next_run/last_run column, so the forecast
    // can't tell on its own whether this month's transfer already happened
    // — that only exists as a confirmed monthly_budget_runs row for the
    // current month. Look one up here and pass along the rule ids it
    // covered so the forecast doesn't project a contribution this month on
    // top of the one that was already made.
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const confirmedRunForCurrentMonth = (budgetWorkspaceQuery.data?.runs ?? []).find(
      (run: any) => run.status === "confirmed" && String(run.month).slice(0, 7) === currentMonthKey,
    );
    const confirmedRuleIdsForCurrentMonth = new Set<string>(
      ((confirmedRunForCurrentMonth?.preview_snapshot as any)?.transfers ?? [])
        .map((transfer: any) => transfer.ruleId ?? transfer.generatedByRuleId)
        .filter((ruleId: unknown): ruleId is string => typeof ruleId === "string"),
    );

    return buildSavingPotForecasts({
      pots: (savingPotsQuery.data ?? []).map((pot: any) => {
        const balance = balancesByPotId.get(pot.id) as any;
        return {
          id: pot.id,
          targetAmount: balance?.target_amount ?? pot.target_amount,
          currentAmount: balance?.balance ?? 0,
        };
      }),
      recurringTransfers: recurringQuery.data ?? [],
      monthlyBudgetRules: budgetWorkspaceQuery.data?.rules ?? [],
      savingPotAccountAssignments: assignmentsQuery.data ?? [],
      confirmedRuleIdsForCurrentMonth,
    });
  }, [assignmentsQuery.data, balancesQuery.data, budgetWorkspaceQuery.data?.rules, budgetWorkspaceQuery.data?.runs, recurringQuery.data, savingPotsQuery.data]);
}
