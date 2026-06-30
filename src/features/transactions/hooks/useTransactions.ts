import { useQuery } from "@tanstack/react-query";

import { transactionsService } from "../services/transaction.service";
import { useSession } from "@/shared/session";
import type { TransactionFilters } from "@/shared/lib/repositories/transactions.repository";

export function useTransactions(filters: TransactionFilters = {}) {
  const { data: session, isPending: sessionLoading } = useSession();
  const householdId = session?.household.id;

  return useQuery({
    queryKey: ["transactions", householdId, filters],
    queryFn: () => transactionsService.getTransactions(householdId!, filters),
    enabled: !!householdId && !sessionLoading,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => transactionsService.getTransaction(id),
    enabled: !!id,
  });
}