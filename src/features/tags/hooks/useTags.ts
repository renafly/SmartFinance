import { useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { tagsService } from "../services/tags.service";
import type { TagPeriodRange, TagTransaction, TransactionTag } from "../types";

/**
 * Query keys -- all also registered in HOUSEHOLD_QUERY_KEYS
 * (src/lib/query-invalidation.ts) so creating/editing/deleting any
 * transaction refreshes tag totals too.
 */
export const TAG_QUERY_KEYS = {
  tags: "transaction-tags",
  summaries: "transaction-tag-summaries",
  transactions: "transaction-tag-transactions",
  transactionTagIds: "transaction-tag-ids",
} as const;

function invalidateTagQueries(queryClient: QueryClient) {
  for (const key of Object.values(TAG_QUERY_KEYS)) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** Every tag in the household, alphabetically -- feeds the TagPicker. */
export function useTags() {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: [TAG_QUERY_KEYS.tags, householdId],
    queryFn: () => tagsService.listTags(householdId!),
    enabled: !!householdId && !isLoading,
  });
}

/** Per-tag totals for a period (open bounds = all time). */
export function useTagSummaries(range: TagPeriodRange) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: [TAG_QUERY_KEYS.summaries, householdId, range.from, range.to],
    queryFn: () => tagsService.getSummaries(householdId!, range),
    enabled: !!householdId && !isLoading,
  });
}

function tagTransactionsQuery(
  householdId: string | null | undefined,
  tagId: string | null,
  range: TagPeriodRange,
  enabled: boolean,
) {
  return {
    queryKey: [TAG_QUERY_KEYS.transactions, householdId, tagId, range.from, range.to],
    queryFn: () => tagsService.getTagTransactions(householdId!, tagId!, range),
    enabled: enabled && !!householdId && !!tagId,
  };
}

/** A tag's transactions for a period -- only fetched while the tag is expanded. */
export function useTagTransactions(tagId: string | null, range: TagPeriodRange, enabled = true) {
  const { householdId, isLoading } = useAuth();

  return useQuery(tagTransactionsQuery(householdId, tagId, range, enabled && !isLoading));
}

/**
 * Transactions for several tags at once (the Tags screen's category chart).
 * Same query key/fn as useTagTransactions, so results are shared with the
 * expanded tag rows instead of fetched twice.
 */
export function useTagTransactionsForTags(tagIds: readonly string[], range: TagPeriodRange) {
  const { householdId, isLoading } = useAuth();

  return useQueries({
    queries: tagIds.map((tagId) => tagTransactionsQuery(householdId, tagId, range, !isLoading)),
    combine: (results) => ({
      lists: results.map((result) => result.data as TagTransaction[] | undefined),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
      refetchFailed: () => {
        for (const result of results) if (result.isError) void result.refetch();
      },
    }),
  });
}

/** The tag ids currently assigned to one transaction (used by the edit modal). */
export function useTransactionTagIds(transactionId: string | null) {
  return useQuery({
    queryKey: [TAG_QUERY_KEYS.transactionTagIds, transactionId],
    queryFn: () => tagsService.getTransactionTagIds(transactionId!),
    enabled: !!transactionId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { householdId, profile } = useAuth();

  return useMutation({
    mutationFn: ({ name, existing }: { name: string; existing: readonly TransactionTag[] }) =>
      tagsService.createTag({ name }, { householdId: householdId!, createdBy: profile!.id, existing }),
    onSuccess: () => invalidateTagQueries(queryClient),
  });
}

export function useRenameTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, existing }: { id: string; name: string; existing: readonly TransactionTag[] }) =>
      tagsService.renameTag({ id, name }, { existing }),
    onSuccess: () => invalidateTagQueries(queryClient),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tagsService.deleteTag(id),
    onSuccess: () => invalidateTagQueries(queryClient),
  });
}

export function useSetTransactionTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, tagIds }: { transactionId: string; tagIds: readonly string[] }) =>
      tagsService.setTransactionTags(transactionId, tagIds),
    onSuccess: () => invalidateTagQueries(queryClient),
  });
}
