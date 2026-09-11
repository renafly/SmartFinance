import { useMemo } from "react";

import { useAccounts, useAccountsWithBalances } from "@/features/accounts/hooks";
import { useAllPlannedItemOccurrences, usePlannedItems } from "@/features/planned-items/hooks";
import { buildPlannedItemForecastContributions } from "@/features/planned-items/services/planned-item-forecast-contributions";
import { useRecurringTransactions } from "@/features/recurring-transactions/hooks";
import { useSavingPotAccountAssignments, useSavingPots } from "@/features/saving-pots/hooks";

import {
  buildAccountBalanceForecasts,
  combineBalanceForecasts,
  type AccountBalanceForecast,
  type BalanceForecast,
} from "../services/balance-forecast.service";

/**
 * Forecasts are always computed over the longest period the UI offers
 * (see FORECAST_PERIOD_OPTIONS in ui-utils.ts) and sliced down for shorter
 * selections, so switching the period in the UI is just an array slice —
 * no refetch or recomputation needed.
 */
const FORECAST_HORIZON_MONTHS = 24;

/**
 * Computes a month-by-month balance forecast for every non-archived
 * account in the household, derived from active recurring transactions/
 * transfers and planned_items (Monthly Budget) destinations — see
 * balance-forecast.service.ts for the calculation itself, and
 * planned-item-forecast-contributions.ts for how a planned item's
 * destinations become dated, already-executed-aware contributions (the
 * same shared function useSavingPotForecasts uses, so this graph and the
 * Savings list can never disagree about a pot's objective date).
 */
export function useAccountBalanceForecasts() {
  const accountsQuery = useAccounts();
  const balancesQuery = useAccountsWithBalances();
  const recurringQuery = useRecurringTransactions();
  const plannedItemsQuery = usePlannedItems();
  const occurrencesQuery = useAllPlannedItemOccurrences();
  const assignmentsQuery = useSavingPotAccountAssignments();

  const isLoading =
    accountsQuery.isPending ||
    balancesQuery.isPending ||
    recurringQuery.isPending ||
    plannedItemsQuery.isPending ||
    occurrencesQuery.isPending ||
    assignmentsQuery.isPending;

  const forecasts = useMemo(() => {
    // account_balances (used by useAccountsWithBalances) doesn't expose
    // is_archived, so the set of accounts to forecast comes from the plain
    // accounts list (excludes archived by default) — balances are then
    // looked up by id from the balances query.
    const currentBalanceByAccountId = new Map(
      (balancesQuery.data ?? []).map((account: any) => [account.id, account.current_balance]),
    );

    const asOf = new Date();
    const contributions = buildPlannedItemForecastContributions({
      plannedItems: plannedItemsQuery.data ?? [],
      occurrences: occurrencesQuery.data ?? [],
      asOf,
      horizonMonths: FORECAST_HORIZON_MONTHS,
    });

    return buildAccountBalanceForecasts({
      accounts: (accountsQuery.data ?? []).map((account: any) => ({
        id: account.id,
        currentBalance: currentBalanceByAccountId.get(account.id) ?? 0,
      })),
      recurringRules: (recurringQuery.data ?? []).map((rule: any) => ({
        id: rule.id,
        ruleKind: rule.rule_kind,
        type: rule.type,
        accountId: rule.account_id,
        destinationAccountId: rule.destination_account_id,
        destinationPotId: rule.destination_pot_id,
        amount: rule.amount,
        frequency: rule.frequency,
        isActive: rule.is_active,
        nextRun: rule.next_run,
        createdAt: rule.created_at,
        excludedMonths: rule.excluded_months,
      })),
      plannedItemContributions: contributions.map((contribution) => ({
        id: contribution.destinationKey,
        sourceAccountId: contribution.sourceAccountId,
        destinationAccountId: contribution.destinationAccountId,
        amount: contribution.amount,
        isActive: true,
        dueMonthKeys: contribution.dueMonthKeys,
        skipMonthKeys: contribution.skipMonthKeys,
      })),
      savingPotAccountAssignments: assignmentsQuery.data ?? [],
      horizonMonths: FORECAST_HORIZON_MONTHS,
      asOf,
    });
  }, [
    accountsQuery.data,
    balancesQuery.data,
    recurringQuery.data,
    plannedItemsQuery.data,
    occurrencesQuery.data,
    assignmentsQuery.data,
  ]);

  return { forecasts, isLoading };
}

export type PotBalanceForecast = BalanceForecast & {
  potId: string;
  /** Accounts whose balances make up this pot — the same set saving_pot_balances sums. */
  accountIds: string[];
};

/**
 * A saving pot's forecast is the combined forecast of the accounts backing
 * it (its explicit selection via saving_pot_accounts, or every household
 * account when none are selected) — exactly mirroring how the
 * `saving_pot_balances` view derives a pot's *current* balance, just
 * projected forward instead of summed as of today.
 */
export function usePotBalanceForecasts() {
  const { forecasts: accountForecasts, isLoading: isAccountForecastLoading } = useAccountBalanceForecasts();
  const potsQuery = useSavingPots();
  const assignmentsQuery = useSavingPotAccountAssignments();
  const accountsQuery = useAccounts();

  const isLoading = isAccountForecastLoading || potsQuery.isPending || assignmentsQuery.isPending || accountsQuery.isPending;

  const forecasts = useMemo(() => {
    const allAccountIds = (accountsQuery.data ?? []).map((account: any) => account.id as string);
    const assignedAccountIdsByPotId = new Map<string, string[]>();
    for (const assignment of (assignmentsQuery.data ?? []) as any[]) {
      const list = assignedAccountIdsByPotId.get(assignment.pot_id) ?? [];
      list.push(assignment.account_id);
      assignedAccountIdsByPotId.set(assignment.pot_id, list);
    }

    return new Map<string, PotBalanceForecast>(
      (potsQuery.data ?? []).map((pot: any) => {
        const assignedAccountIds = assignedAccountIdsByPotId.get(pot.id) ?? [];
        const accountIds = assignedAccountIds.length > 0 ? assignedAccountIds : allAccountIds;
        const combined = combineBalanceForecasts(
          accountIds
            .map((accountId) => accountForecasts.get(accountId))
            .filter((forecast): forecast is AccountBalanceForecast => Boolean(forecast)),
        );

        return [pot.id, { ...combined, potId: pot.id, accountIds }];
      }),
    );
  }, [accountForecasts, potsQuery.data, assignmentsQuery.data, accountsQuery.data]);

  return { forecasts, isLoading };
}
