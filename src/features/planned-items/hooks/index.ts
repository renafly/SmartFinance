import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

import { repositories } from "@/repositories";

import { plannedItemsConfirmService } from "../services/planned-items-confirm.service";
import { plannedItemsService } from "../services/planned-items.service";
import { rowToMonthlyBudgetPeriod, rowToPlannedItemOccurrence, rowToPlannedItemOccurrenceDestination } from "../services/planned-items.service";
import type { PlannedItemDraft, PlannedItemMatch } from "../types";
import type { Database } from "@/types/database.types";

// ------------------------------------------------------------
// planned_items CRUD -- mirrors useIncomeSources.ts /
// useRecurringExpenses.ts's useQuery/useMutation-wrapper pattern.
// ------------------------------------------------------------

export function usePlannedItems() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["planned-items", householdId],
    queryFn: () => plannedItemsService.getPlannedItems(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

/** Every occurrence for the household, no month filter -- see planned-item-forecast-contributions.ts, the only current consumer (via the saving-pots/forecast forecast hooks). */
export function useAllPlannedItemOccurrences() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["planned-items-occurrences-all", householdId],
    queryFn: () => plannedItemsService.getOccurrencesForHousehold(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

export function useCreatePlannedItem() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();

  return useMutation({
    mutationFn: (draft: PlannedItemDraft) =>
      plannedItemsService.createPlannedItem(draft, {
        householdId: householdId!,
        createdBy: profile!.id,
      }),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useUpdatePlannedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: PlannedItemDraft) => plannedItemsService.updatePlannedItem(draft),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useSetPlannedItemActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      plannedItemsService.setActive(id, isActive),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

export function useDeletePlannedItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => plannedItemsService.deletePlannedItem(id),
    onSuccess: () => {
      invalidateHouseholdData(queryClient);
    },
  });
}

// ------------------------------------------------------------
// Resolve / preview / confirm -- one month at a time.
// ------------------------------------------------------------

/** Resolves AND materializes the month (see previewMonth's doc comment in planned-items-confirm.service.ts for why materializing here is deliberate) -- this is what the Monthly Budget screen should load. */
export function usePlannedItemsPreview(month?: string | null) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["planned-items-preview", householdId, month],
    queryFn: () => plannedItemsConfirmService.previewMonth(householdId!, month!),
    enabled: !!householdId && !!month && !isLoading,
  });
}

function invalidatePlannedMonth(queryClient: ReturnType<typeof useQueryClient>) {
  // Every mutation below writes or deletes real `transactions` rows
  // (confirm generates them; revert/revertOccurrence delete them) and can
  // move money between real accounts -- so a narrow, planned-items-only
  // invalidation leaves the Transactions list, account balances,
  // Dashboard and Insights showing stale data right after a successful
  // confirm or reset (the mutation succeeds and the toast says so, but
  // nothing else on screen visibly changes until an unrelated refetch
  // happens to run). Use the same household-wide invalidation every
  // other cross-cutting mutation in this app uses instead of a bespoke
  // subset -- it's a strict superset of the four keys this used to
  // invalidate (planned-items-preview/-resolved, monthly-budget-periods,
  // planned-item-matches are all in HOUSEHOLD_QUERY_KEYS).
  invalidateHouseholdData(queryClient);
}

export function useConfirmPlannedItemMonth() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();

  return useMutation({
    mutationFn: (month: string) => plannedItemsConfirmService.confirmMonth(householdId!, month, profile!.id),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

/** Bulk revert of an entire month -- deletes every transaction that
 * month's Monthly Budget confirm generated and reopens the month. See
 * plannedItemsConfirmService.revertMonth. */
export function useRevertMonthlyBudgetMonth() {
  const queryClient = useQueryClient();
  const { householdId } = useAuth();

  return useMutation({
    mutationFn: (month: string) => plannedItemsConfirmService.revertMonth(householdId!, month),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

/** Pays a single eligible (single-leg, plain-expense) occurrence right now -- see plannedItemsConfirmService.confirmOccurrence. `actualAmount` omitted keeps the occurrence's own expected amount. */
export function useConfirmPlannedItemOccurrence() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ occurrenceId, actualAmount }: { occurrenceId: string; actualAmount?: number }) =>
      plannedItemsConfirmService.confirmOccurrence(occurrenceId, profile!.id, actualAmount),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

export function useMatchPlannedItemOccurrence() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ occurrenceId, transactionId }: { occurrenceId: string; transactionId: string }) =>
      plannedItemsConfirmService.matchOccurrence(occurrenceId, transactionId, profile!.id),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

export function useUnmatchPlannedItemOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.unmatchOccurrence(occurrenceId),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

/** "Unmark as paid, keep the transaction" for a 'confirmed' occurrence -- see plannedItemsConfirmService.unlinkOccurrenceTransaction. Use useRevertPlannedItemOccurrence instead when the user wants the generated transaction deleted too. */
export function useUnlinkPlannedItemOccurrenceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.unlinkOccurrenceTransaction(occurrenceId),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

/** "Unmark as paid, delete the transaction" for a 'confirmed' occurrence -- see plannedItemsConfirmService.revertOccurrence. Only while the household's monthly_budget_periods row for `month` is still 'open' (or absent, which counts as open) -- the RPC itself enforces this and its error surfaces through the mutation's onError. Use useUnlinkPlannedItemOccurrenceTransaction instead to keep the transaction. */
export function useRevertPlannedItemOccurrence() {
  const queryClient = useQueryClient();
  const { householdId } = useAuth();

  return useMutation({
    mutationFn: ({ occurrenceId, month }: { occurrenceId: string; month: string }) =>
      plannedItemsConfirmService.revertOccurrence(occurrenceId, householdId!, month),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

export function useSkipPlannedItemOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.skipOccurrence(occurrenceId),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

/** Matched-occurrence links for a set of occurrence ids, keyed by occurrenceId for O(1) lookups -- same shape as useRecurringExpenseMatches's matchByKey. */
export function usePlannedItemMatches(occurrenceIds: string[]) {
  const sortedIds = useMemo(() => [...occurrenceIds].sort(), [occurrenceIds]);

  const query = useQuery({
    queryKey: ["planned-item-matches", sortedIds],
    queryFn: () => plannedItemsConfirmService.getMatches(sortedIds),
    enabled: sortedIds.length > 0,
  });

  const matchByOccurrenceId = useMemo(() => {
    const map = new Map<string, PlannedItemMatch>();
    for (const match of query.data ?? []) {
      map.set(match.occurrenceId, match);
    }
    return map;
  }, [query.data]);

  return { ...query, matchByOccurrenceId };
}

// ------------------------------------------------------------
// Month lock -- reads the household's MonthlyBudgetPeriod for a given
// month directly off the repository (there is no dedicated service method
// for a bare read; planned-items-confirm.service.ts only reads this
// internally, inside revertOccurrence's own guard). A period only exists
// once something has materialized/confirmed that month -- no row yet reads
// as 'open' (the default a month starts in before anyone touches it).
// ------------------------------------------------------------
export function useMonthlyBudgetPeriod(month?: string | null) {
  const { householdId, isLoading } = useAuth();
  const normalizedMonth = month ? `${month.slice(0, 7)}-01` : null;

  return useQuery({
    queryKey: ["monthly-budget-periods", householdId, normalizedMonth],
    queryFn: async () => {
      const { data, error } = await repositories.plannedItems.getMonthlyBudgetPeriod(householdId!, normalizedMonth!);
      if (error) throw error;
      return data ? rowToMonthlyBudgetPeriod(data) : null;
    },
    enabled: !!householdId && !!normalizedMonth && !isLoading,
  });
}

// ------------------------------------------------------------
// Trend chart data -- the old Monthly Budget screen read
// `run.preview_snapshot.remainingCash` off `monthly_budget_runs`, a table
// this rebuild retires (see budget.tsx's own doc comment on the
// "Tendência" section). There is no equivalent snapshot column on
// `planned_item_occurrences`, so this aggregates the last `monthsBack`
// months' worth of already-resolved history (status 'confirmed'/'matched'
// occurrences only -- never re-invokes the full resolver for a past month,
// which would recompute against *today's* planned_items templates instead
// of showing what that month actually settled to) directly, one
// listOccurrencesForMonth call per month (there are at most a handful of
// months here, so this stays a handful of small queries rather than one
// bespoke range-query repository method).
// ------------------------------------------------------------
export type RecentPlannedMonthSummary = {
  /** "YYYY-MM" */
  month: string;
  income: number;
  /**
   * Outflow that is NOT itself a transfer into a savings/investment
   * account -- i.e. every settled outflow occurrence's amount, minus
   * whatever portion of it landed in a `savings`/`investments` bucket
   * below. Without this subtraction a "move money to savings" planned
   * item (direction='outflow', destination account type='savings')
   * would be counted once here AND again in `savings`, which is exactly
   * the double-counted-total bug the redesigned Monthly Preview (see
   * buildMonthlyPreviewViewModel's own doc comment) fixes for the
   * current month -- this trend data needed the same fix to stay
   * consistent with it for "compared with last month".
   */
  expenses: number;
  /** Settled destination amounts landing in a `type = 'savings'` account. Only populated when `accountTypeById` (an accountId -> account_type map, e.g. from the accounts already loaded by the caller) is passed in -- otherwise 0. */
  savings: number;
  /** Same as `savings`, for `type = 'investment'` destination accounts. */
  investments: number;
  /** income - expenses - savings - investments, the direct analogue of the old run's remainingCash. */
  remainingCash: number;
};

function lastNMonths(monthsBack: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/**
 * @param accountTypeById accountId -> account_type, used only to split
 * settled outflow amounts into expenses/savings/investments (see
 * RecentPlannedMonthSummary's doc comment). Pass the caller's own
 * already-loaded accounts list keyed by id -- this hook never fetches
 * accounts itself, to avoid a second accounts query duplicating one the
 * screen almost certainly already has. Omit it (or pass an empty map) to
 * get the old behavior back (`expenses` = every settled outflow amount,
 * `savings`/`investments` both 0).
 */
export function useRecentPlannedMonthsSummary(
  monthsBack = 6,
  accountTypeById: Map<string, Database["public"]["Enums"]["account_type"]> = new Map(),
) {
  const { householdId, isLoading } = useAuth();
  const months = useMemo(() => lastNMonths(monthsBack), [monthsBack]);

  return useQuery({
    queryKey: ["planned-items-recent-summary", householdId, months],
    queryFn: async () => {
      const results = await Promise.all(
        months.map((month) => repositories.plannedItems.listOccurrencesForMonth(householdId!, `${month}-01`)),
      );

      // planned_item_occurrences carries no `direction` column of its
      // own -- it's read off the parent planned_items row, which this
      // lightweight aggregation deliberately doesn't join in (see the
      // module doc comment above). Every occurrence this rebuild creates
      // for an inflow item has a null source_account_id (planned_items'
      // planned_items_source_account_by_direction check enforces that at
      // the template level, and materialize copies it through unchanged)
      // while every outflow occurrence has one set -- so that column
      // doubles as the direction signal here without a join.
      const settledByMonth = results.map((result) => {
        if (result.error) throw result.error;
        return (result.data ?? [])
          .map(rowToPlannedItemOccurrence)
          .filter((occurrence) => occurrence.status === "confirmed" || occurrence.status === "matched");
      });

      // One batched destinations fetch for every settled occurrence
      // across every month, rather than one call per month -- there are
      // at most a handful of months here, so this stays a single extra
      // round trip, not `monthsBack` of them.
      const allSettledOccurrenceIds = settledByMonth.flat().map((occurrence) => occurrence.id);
      const destinationsResult = await repositories.plannedItems.listOccurrenceDestinations(allSettledOccurrenceIds);
      if (destinationsResult.error) throw destinationsResult.error;
      const destinationsByOccurrenceId = new Map<string, ReturnType<typeof rowToPlannedItemOccurrenceDestination>[]>();
      for (const destination of (destinationsResult.data ?? []).map(rowToPlannedItemOccurrenceDestination)) {
        const bucket = destinationsByOccurrenceId.get(destination.occurrenceId) ?? [];
        bucket.push(destination);
        destinationsByOccurrenceId.set(destination.occurrenceId, bucket);
      }

      const summaries: RecentPlannedMonthSummary[] = [];
      settledByMonth.forEach((settled, index) => {
        if (settled.length === 0) return;

        let income = 0;
        let outflowTotal = 0;
        let savings = 0;
        let investments = 0;

        for (const occurrence of settled) {
          if (occurrence.sourceAccountId === null) {
            income += occurrence.expectedAmount;
            continue;
          }
          outflowTotal += occurrence.expectedAmount;
          for (const destination of destinationsByOccurrenceId.get(occurrence.id) ?? []) {
            const accountType = accountTypeById.get(destination.destinationAccountId);
            if (accountType === "savings") savings += destination.amount;
            if (accountType === "investment") investments += destination.amount;
          }
        }

        const expenses = outflowTotal - savings - investments;
        summaries.push({
          month: months[index],
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          savings: Math.round(savings * 100) / 100,
          investments: Math.round(investments * 100) / 100,
          remainingCash: Math.round((income - outflowTotal) * 100) / 100,
        });
      });

      return summaries;
    },
    enabled: !!householdId && !isLoading,
  });
}

// ------------------------------------------------------------
// Estimate-occurrence matching -- candidate real transactions to link to
// an is_estimate occurrence, and title labels for already-matched ones.
// Mirrors useOccurrenceTransactionCandidates/useMatchedTransactionLabels in
// recurring-expenses/hooks (see that feature's own doc comment) --
// direction-aware here since planned_items covers both outflow (expense)
// and inflow (income) estimates, where recurring_expenses only ever
// covered expenses.
// ------------------------------------------------------------
function monthDateRange(month: string) {
  const [year, monthNumber] = month.slice(0, 7).split("-").map(Number);
  const start = `${month.slice(0, 7)}-01`;
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const end = `${month.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Candidate transactions to link an occurrence to. Deliberately searches
 * the WHOLE household for this month + direction (type), not just
 * `accountId` -- a hard account filter here means "no matches" even when
 * the real transaction exists, the moment the occurrence's own
 * source_account_id and the transaction's account_id disagree for any
 * reason (an account was recreated/reassigned since the occurrence was
 * materialized, the user logged it to the wrong account, etc.) -- a
 * confusing, silent dead end for something this hard to debug from the
 * UI alone. `accountId` is still used (not as a filter) to sort same-
 * account candidates first and to flag them in the picker, since most of
 * the time it IS the right account and should surface at the top.
 */
export function usePlannedItemOccurrenceCandidates(
  accountId: string | null,
  month: string,
  direction: "outflow" | "inflow",
  enabled: boolean,
  /** Optional exact-category scope -- pass the occurrence's own category id to try that category (plus its direct children, see TransactionsRepository.resolveCategoryFilterIds) FIRST. Omit (or pass null/undefined) to search unscoped, the original behavior every other caller still gets. */
  categoryId?: string | null,
  /** Optional fallback category scope, tried only when `categoryId` is set AND that first search comes back empty (and only when it actually differs from `categoryId` -- no point re-running an identical query) -- pass the category's root-of-hierarchy ancestor (CategoryBudgetEntry.mainCategoryId) so a transaction logged under a sibling subcategory in the same family still turns up before falling all the way back to "nothing found". Ignored when `categoryId` is omitted. */
  mainCategoryId?: string | null,
) {
  const { householdId } = useAuth();
  const { start, end } = monthDateRange(month);

  return useQuery({
    queryKey: ["planned-item-occurrence-candidates", householdId, month, direction, categoryId ?? null, mainCategoryId ?? null],
    queryFn: async () => {
      async function search(scopeCategoryId: string | null | undefined) {
        const { data, error } = await repositories.transactions.listForHousehold(householdId!, {
          type: direction === "outflow" ? "expense" : "income",
          from: start,
          to: end,
          sortBy: "newest",
          limit: 40,
          ...(scopeCategoryId ? { categoryId: scopeCategoryId } : {}),
        });
        if (error) throw error;
        return data ?? [];
      }

      let rows = await search(categoryId);
      // Sub-category search came back empty -- widen to the whole
      // category family (parent + every direct child) before giving up,
      // in case the user logged it under a sibling subcategory instead of
      // this occurrence's own exact one.
      if (categoryId && rows.length === 0 && mainCategoryId && mainCategoryId !== categoryId) {
        rows = await search(mainCategoryId);
      }
      // Same-account candidates first (most likely to be the right one),
      // newest-within-group after that -- listForHousehold already
      // sorted newest-first, Array#sort is stable so that order survives
      // within each group.
      return accountId
        ? [...rows].sort((a, b) => Number(b.account_id === accountId) - Number(a.account_id === accountId))
        : rows;
    },
    enabled: enabled && !!householdId,
  });
}

/** Title/amount lookup for a set of transaction ids -- used to label a matched planned-item occurrence without pulling each transaction's full relations. */
export function usePlannedItemMatchedTransactionLabels(transactionIds: string[]) {
  const sortedIds = useMemo(() => [...transactionIds].sort(), [transactionIds]);

  const query = useQuery({
    queryKey: ["planned-item-matched-transactions", sortedIds],
    queryFn: async () => {
      const { data, error } = await repositories.transactions.listByIds(sortedIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: sortedIds.length > 0,
  });

  const byId = useMemo(() => {
    const map = new Map<string, { title: string; amount: number; transaction_date: string }>();
    for (const transaction of query.data ?? []) {
      map.set(transaction.id, transaction);
    }
    return map;
  }, [query.data]);

  return { ...query, byId };
}

