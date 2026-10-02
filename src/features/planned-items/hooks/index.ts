import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { invalidateHouseholdData } from "@/lib/query-invalidation";

import { repositories } from "@/repositories";

import { plannedItemsConfirmService } from "../services/planned-items-confirm.service";
import { plannedItemsService } from "../services/planned-items.service";
import { rowToMonthlyBudgetPeriod } from "../services/planned-items.service";
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
      void queryClient.invalidateQueries({ queryKey: [BATCH_KEY] });
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
      void queryClient.invalidateQueries({ queryKey: [BATCH_KEY] });
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
// Monthly Budget "Create all transfers" batches.
// ------------------------------------------------------------

const BATCH_KEY = "monthly-budget-batches";

/** The month's live batch (what "Create all transfers" created), or null. */
export function useMonthlyBudgetBatch(month?: string | null) {
  const { householdId, isLoading } = useAuth();
  const normalizedMonth = month ? `${month.slice(0, 7)}-01` : null;

  return useQuery({
    queryKey: [BATCH_KEY, householdId, normalizedMonth],
    queryFn: async () => {
      const { data, error } = await repositories.plannedItems.getActiveBatchForMonth(householdId!, normalizedMonth!);
      if (error) throw error;
      return data;
    },
    enabled: !!householdId && !!normalizedMonth && !isLoading,
  });
}

/** Exactly the transactions a batch created -- for "View transfers". */
export function useMonthlyBudgetBatchTransactions(batchId?: string | null, enabled = true) {
  return useQuery({
    queryKey: [BATCH_KEY, "transactions", batchId],
    queryFn: async () => {
      const { data, error } = await repositories.plannedItems.listBatchTransactions(batchId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!batchId && enabled,
  });
}

export function useUndoMonthlyBudgetBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await repositories.plannedItems.undoBatch(batchId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidatePlannedMonth(queryClient);
      void queryClient.invalidateQueries({ queryKey: [BATCH_KEY] });
    },
  });
}

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

