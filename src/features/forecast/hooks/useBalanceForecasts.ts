import { useMemo } from "react";

import { useAccounts, useAccountsWithBalances } from "@/features/accounts/hooks";
import { useMonthlyBudgetWorkspace } from "@/features/monthly-budget/hooks";
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
 * transfers and Monthly Budget rules. See balance-forecast.service.ts for
 * the calculation itself — this hook only adapts Supabase query data into
 * its input shape.
 */
export function useAccountBalanceForecasts() {
  const accountsQuery = useAccounts();
  const balancesQuery = useAccountsWithBalances();
  const recurringQuery = useRecurringTransactions();
  const budgetWorkspaceQuery = useMonthlyBudgetWorkspace();
  const assignmentsQuery = useSavingPotAccountAssignments();

  const isLoading =
    accountsQuery.isPending ||
    balancesQuery.isPending ||
    recurringQuery.isPending ||
    budgetWorkspaceQuery.isPending ||
    assignmentsQuery.isPending;

  const forecasts = useMemo(() => {
    // account_balances (used by useAccountsWithBalances) doesn't expose
    // is_archived, so the set of accounts to forecast comes from the plain
    // accounts list (excludes archived by default) — balances are then
    // looked up by id from the balances query.
    const currentBalanceByAccountId = new Map(
      (balancesQuery.data ?? []).map((account: any) => [account.id, account.current_balance]),
    );

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const confirmedRunForCurrentMonth = (budgetWorkspaceQuery.data?.runs ?? []).find(
      (run: any) => run.status === "confirmed" && String(run.month).slice(0, 7) === currentMonthKey,
    );
    const confirmedBudgetRuleIdsForCurrentMonth = new Set<string>(
      ((confirmedRunForCurrentMonth?.preview_snapshot as any)?.transfers ?? [])
        .map((transfer: any) => transfer.ruleId ?? transfer.generatedByRuleId)
        .filter((ruleId: unknown): ruleId is string => typeof ruleId === "string"),
    );

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
      budgetRules: (budgetWorkspaceQuery.data?.rules ?? []).map((rule: any) => ({
        id: rule.id,
        sourceAccountId: rule.source_account_id,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        activeMonths: rule.active_months,
        activeFromMonth: rule.active_from_month,
        activeToMonth: rule.active_to_month,
        allocations: (rule.allocations ?? []).map((allocation: any) => ({
          destinationAccountId: allocation.destination_account_id,
          amount: allocation.amount,
        })),
      })),
      savingPotAccountAssignments: assignmentsQuery.data ?? [],
      confirmedBudgetRuleIdsForCurrentMonth,
      horizonMonths: FORECAST_HORIZON_MONTHS,
    });
  }, [
    accountsQuery.data,
    balancesQuery.data,
    recurringQuery.data,
    budgetWorkspaceQuery.data?.rules,
    budgetWorkspaceQuery.data?.runs,
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
