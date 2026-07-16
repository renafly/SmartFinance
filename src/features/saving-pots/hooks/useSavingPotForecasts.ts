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
    });
  }, [assignmentsQuery.data, balancesQuery.data, budgetWorkspaceQuery.data?.rules, recurringQuery.data, savingPotsQuery.data]);
}
