import { useMemo } from "react";

import { useAllPlannedItemOccurrences, usePlannedItems } from "@/features/planned-items/hooks";
import { buildPlannedItemForecastContributions } from "@/features/planned-items/services/planned-item-forecast-contributions";
import { useRecurringTransactions } from "@/features/recurring-transactions/hooks";
import { buildSavingPotForecasts, savingPotForecastConstants } from "../services/saving-pot-forecast.service";
import { useSavingPotAccountAssignments, useSavingPotBalances, useSavingPots } from "./useSavingPotQueries";

/**
 * Monthly-Budget-driven pot contributions are sourced from planned_items
 * (+ their real planned_item_occurrences, for "already executed" state) --
 * see planned-item-forecast-contributions.ts's module doc comment for why
 * this replaced the old budget_rules/monthly_budget_runs read (those
 * tables are write-dead post-Planned-Items-migration, so that old lookup
 * silently stopped finding anything the moment a household switched over,
 * which is what caused this forecast to double-count a month's
 * contribution that had already landed in the pot's balance).
 */
export function useSavingPotForecasts() {
  const savingPotsQuery = useSavingPots();
  const balancesQuery = useSavingPotBalances();
  const assignmentsQuery = useSavingPotAccountAssignments();
  const recurringQuery = useRecurringTransactions();
  const plannedItemsQuery = usePlannedItems();
  const occurrencesQuery = useAllPlannedItemOccurrences();

  return useMemo(() => {
    const balancesByPotId = new Map(
      (balancesQuery.data ?? []).map((balance: any) => [balance.id, balance]),
    );

    const asOf = new Date();
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: plannedItemsQuery.data ?? [],
      occurrences: occurrencesQuery.data ?? [],
      asOf,
      horizonMonths: savingPotForecastConstants.FORECAST_HORIZON_MONTHS,
    });

    const monthlyBudgetRules = contributions.map((contribution) => ({
      id: contribution.destinationKey,
      source_account_id: contribution.sourceAccountId,
      destination_account_id: contribution.destinationAccountId,
      amount: contribution.amount,
      frequency: "monthly" as const,
      is_active: true,
      dueMonthKeys: contribution.dueMonthKeys,
      skipMonthKeys: contribution.skipMonthKeys,
    }));

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
      monthlyBudgetRules,
      savingPotAccountAssignments: assignmentsQuery.data ?? [],
      asOf,
    });
  }, [
    assignmentsQuery.data,
    balancesQuery.data,
    occurrencesQuery.data,
    plannedItemsQuery.data,
    recurringQuery.data,
    savingPotsQuery.data,
  ]);
}
