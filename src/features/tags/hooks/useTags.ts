import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";

import { tagsService } from "../services/tags.service";
import type { TagPeriodRange, TransactionTag } from "../types";

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

/** A tag's transactions for a period -- only fetched while the tag is expanded. */
export function useTagTransactions(tagId: string | null, range: TagPeriodRange, enabled = true) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: [TAG_QUERY_KEYS.transactions, householdId, tagId, range.from, range.to],
    queryFn: () => tagsService.getTagTransactions(householdId!, tagId!, range),
    enabled: enabled && !!householdId && !!tagId && !isLoading,
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
