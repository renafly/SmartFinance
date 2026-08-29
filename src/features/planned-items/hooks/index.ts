import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

import { repositories } from "@/repositories";

import { plannedItemsConfirmService } from "../services/planned-items-confirm.service";
import { plannedItemsService } from "../services/planned-items.service";
import { rowToMonthlyBudgetPeriod, rowToPlannedItemOccurrence } from "../services/planned-items.service";
import type { PlannedItemDraft, PlannedItemMatch } from "../types";

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

/** Read-only resolve -- no materialization, so it never writes anything. Prefer usePlannedItemsPreview for the actual Monthly Budget screen (it needs materialized occurrence ids so revert/match/skip/cancel work on what's shown); this is for a lighter "what would this month look like" check. */
export function useResolvedPlannedMonth(month?: string | null) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["planned-items-resolved", householdId, month],
    queryFn: () => plannedItemsConfirmService.resolveMonth(householdId!, month!),
    enabled: !!householdId && !!month && !isLoading,
  });
}

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

export function useSkipPlannedItemOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.skipOccurrence(occurrenceId),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

export function useCancelPlannedItemOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.cancelOccurrence(occurrenceId),
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
    },
  });
}

export function useResetPlannedItemOccurrenceToTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (occurrenceId: string) => plannedItemsConfirmService.resetOccurrenceToTemplate(occurrenceId),
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
  expenses: number;
  /** income - expenses, the direct analogue of the old run's remainingCash. */
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

export function useRecentPlannedMonthsSummary(monthsBack = 6) {
  const { householdId, isLoading } = useAuth();
  const months = useMemo(() => lastNMonths(monthsBack), [monthsBack]);

  return useQuery({
    queryKey: ["planned-items-recent-summary", householdId, months],
    queryFn: async () => {
      const results = await Promise.all(
        months.map((month) => repositories.plannedItems.listOccurrencesForMonth(householdId!, `${month}-01`)),
      );

      const summaries: RecentPlannedMonthSummary[] = [];
      results.forEach((result, index) => {
        if (result.error) throw result.error;
        const occurrences = (result.data ?? []).map(rowToPlannedItemOccurrence);
        const settled = occurrences.filter((occurrence) => occurrence.status === "confirmed" || occurrence.status === "matched");
        if (settled.length === 0) return;

        // planned_item_occurrences carries no `direction` column of its
        // own -- it's read off the parent planned_items row, which this
        // lightweight aggregation deliberately doesn't join in (see the
        // doc comment above). Every occurrence this rebuild creates for an
        // inflow item has a null source_account_id (planned_items'
        // planned_items_source_account_by_direction check enforces that at
        // the template level, and materialize copies it through
        // unchanged) while every outflow occurrence has one set -- so that
        // column doubles as the direction signal here without a join.
        const income = settled
          .filter((occurrence) => occurrence.sourceAccountId === null)
          .reduce((sum, occurrence) => sum + occurrence.expectedAmount, 0);
        const expenses = settled
          .filter((occurrence) => occurrence.sourceAccountId !== null)
          .reduce((sum, occurrence) => sum + occurrence.expectedAmount, 0);

        summaries.push({
          month: months[index],
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          remainingCash: Math.round((income - expenses) * 100) / 100,
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

export function usePlannedItemOccurrenceCandidates(
  accountId: string | null,
  month: string,
  direction: "outflow" | "inflow",
  enabled: boolean,
) {
  const { householdId } = useAuth();
  const { start, end } = monthDateRange(month);

  return useQuery({
    queryKey: ["planned-item-occurrence-candidates", householdId, accountId, month, direction],
    queryFn: async () => {
      const { data, error } = await repositories.transactions.listForHousehold(householdId!, {
        accountId: accountId!,
        type: direction === "outflow" ? "expense" : "income",
        from: start,
        to: end,
        sortBy: "newest",
        limit: 20,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && !!householdId && !!accountId,
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

