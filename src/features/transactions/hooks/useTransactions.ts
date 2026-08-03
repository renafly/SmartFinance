import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { transactionsService } from "../services/transaction.service";
import { TRANSACTION_RELATIONS_QUERY_VERSION } from "../constants";
import { useAuth } from "@/providers/AuthProvider";
import type { TransactionFilters, TransactionMovementFilters } from "@/repositories/transactions.repository";

export function useTransactionMovementsInfinite(
  filters: TransactionMovementFilters = {},
  pageSize = 25,
  options?: { enabled?: boolean },
) {
  const { householdId, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: ["transaction-movements", householdId, filters, pageSize],
    queryFn: ({ pageParam = 0 }) => transactionsService.getMovements(householdId!, {
      ...filters,
      limit: pageSize,
      offset: pageParam,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < pageSize ? undefined : pages.length * pageSize,
    staleTime: 0,
    refetchOnMount: "always",
    enabled: (options?.enabled ?? true) && !!householdId && !isLoading,
  });
}

export function useTransactions(
  filters: TransactionFilters = {},
  options?: { enabled?: boolean },
) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: [
      "transactions",
      householdId,
      filters,
      TRANSACTION_RELATIONS_QUERY_VERSION,
    ],
    queryFn: () => transactionsService.getTransactions(householdId!, filters),
    enabled: (options?.enabled ?? true) && !!householdId && !isLoading,
  });
}

/** Loads every transaction in a bounded filter range without PostgREST row truncation. */
export function useAllTransactions(
  filters: TransactionFilters = {},
  options?: { enabled?: boolean },
) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: [
      "transactions",
      "all",
      householdId,
      filters,
      TRANSACTION_RELATIONS_QUERY_VERSION,
    ],
    queryFn: async () => {
      const pageSize = 500;
      const rows = [];

      for (let offset = 0; ; offset += pageSize) {
        const page = await transactionsService.getTransactions(householdId!, {
          ...filters,
          limit: pageSize,
          offset,
        });
        rows.push(...page);
        if (page.length < pageSize) break;
      }

      return rows;
    },
    enabled: (options?.enabled ?? true) && !!householdId && !isLoading,
  });
}

export function useTransactionsInfinite(
  filters: TransactionFilters = {},
  pageSize = 25,
  options?: { enabled?: boolean },
) {
  const { householdId, isLoading } = useAuth();

  return useInfiniteQuery({
    queryKey: [
      "transactions",
      householdId,
      filters,
      pageSize,
      "infinite",
      TRANSACTION_RELATIONS_QUERY_VERSION,
    ],
    queryFn: ({ pageParam = 0 }) =>
      transactionsService.getTransactions(householdId!, {
        ...filters,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < pageSize ? undefined : pages.length * pageSize,
    // The application-wide stale time must not allow a previously visited
    // filter combination to skip its request when it becomes active again.
    staleTime: 0,
    refetchOnMount: "always",
    enabled: (options?.enabled ?? true) && !!householdId && !isLoading,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", id, TRANSACTION_RELATIONS_QUERY_VERSION],
    queryFn: () => transactionsService.getTransaction(id),
    enabled: !!id,
  });
}
