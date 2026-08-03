import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

import { normalizeTransactionTitle } from "./normalization";
import { suggestTransactionCategory } from "./service";
import type { TransactionType } from "./types";

type Options = {
  title: string;
  transactionType: TransactionType;
  accountId?: string | null;
  enabled?: boolean;
};

export function useTransactionCategorySuggestion(options: Options) {
  const { householdId, isLoading } = useAuth();
  const normalizedTitle = normalizeTransactionTitle(options.title);
  const [debouncedTitle, setDebouncedTitle] = useState(normalizedTitle);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitle(normalizedTitle), 300);
    return () => clearTimeout(timer);
  }, [normalizedTitle]);

  const query = useQuery({
    queryKey: [
      "transaction-category-suggestion",
      householdId,
      options.transactionType,
      debouncedTitle,
      options.accountId ?? null,
    ],
    queryFn: () =>
      suggestTransactionCategory({
        householdId: householdId!,
        transactionType: options.transactionType,
        title: debouncedTitle,
        accountId: options.accountId,
      }),
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
