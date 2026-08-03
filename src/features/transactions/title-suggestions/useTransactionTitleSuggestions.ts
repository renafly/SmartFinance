import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { transactionsRepository } from "@/repositories/transactions.repository";
import { normalizeTransactionTitle } from "../category-suggestions/normalization";
import { rankTransactionTitleSuggestions } from "./scoring";

export function useTransactionTitleSuggestions(options: {
  title: string;
  transactionType: "income" | "expense";
  accountId?: string | null;
  enabled?: boolean;
}) {
  const { householdId, isLoading } = useAuth();
  const normalizedTitle = normalizeTransactionTitle(options.title);
  const [debouncedTitle, setDebouncedTitle] = useState(normalizedTitle);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitle(normalizedTitle), 300);
    return () => clearTimeout(timer);
  }, [normalizedTitle]);

  const query = useQuery({
    queryKey: [
      "transaction-title-suggestions",
      householdId,
      options.transactionType,
      debouncedTitle,
      options.accountId ?? null,
    ],
    queryFn: async () => {
      const result = await transactionsRepository.listTitleSuggestionHistory(
        householdId!,
        options.transactionType,
      );
      if (result.error) throw result.error;
      return rankTransactionTitleSuggestions(
        debouncedTitle,
        (result.data ?? []).map((item) => ({
          title: item.title,
          accountId: item.account_id,
          categoryId: item.category_id,
          categoryName: item.category?.name ?? null,
          transactionDate: item.transaction_date,
          createdAt: item.created_at,
        })),
        options.accountId,
        5,
      );
    },
    enabled:
      (options.enabled ?? true) &&
      !isLoading &&
      !!householdId &&
      debouncedTitle.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const isDebouncing = normalizedTitle !== debouncedTitle;
  return {
    ...query,
    data: isDebouncing ? undefined : query.data,
    isFetching: query.isFetching || isDebouncing,
  };
}
