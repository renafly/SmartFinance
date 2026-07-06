import { useQuery } from "@tanstack/react-query";

import { transactionsService } from "../services/transaction.service";
import { useAuth } from "@/providers/AuthProvider";
import type { TransactionFilters } from "@/repositories/transactions.repository";

export function useTransactions(filters: TransactionFilters = {}) {
  const { householdId, isLoading } = useAuth();

  return useQuery({
    queryKey: ["transactions", householdId, filters],
    queryFn: () => transactionsService.getTransactions(householdId!, filters),
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
