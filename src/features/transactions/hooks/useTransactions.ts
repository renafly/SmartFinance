import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { transactionsService } from "../services/transaction.service";
import { useAuth } from "@/providers/AuthProvider";
import type { TransactionFilters } from "@/repositories/transactions.repository";

export function useTransactions(filters: TransactionFilters = {}, options?: { enabled?: boolean }) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["transactions", householdId, filters],
    queryFn: () => transactionsService.getTransactions(householdId!, filters),
    enabled: (options?.enabled ?? true) && !!householdId && !isLoading,
  });
}

export function useTransactionsInfinite(filters: TransactionFilters = {}, pageSize = 25) {
  const { householdId, isLoading } = useAuth();

  return useInfiniteQuery({
    queryKey: ["transactions", householdId, filters, pageSize, "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      transactionsService.getTransactions(householdId!, {
        ...filters,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < pageSize ? undefined : pages.length * pageSize,
    enabled: !!householdId && !isLoading,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => transactionsService.getTransaction(id),
    enabled: !!id,
  });
}
