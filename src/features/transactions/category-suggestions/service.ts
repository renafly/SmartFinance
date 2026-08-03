import { transactionsRepository } from "@/repositories/transactions.repository";

import { rankCategorySuggestion } from "./scoring";
import type { CategorySuggestion, SuggestCategoryInput } from "./types";

export async function suggestTransactionCategory(
  input: SuggestCategoryInput,
): Promise<CategorySuggestion | null> {
  const title = input.title.trim();
  if (title.length < 2) return null;

  const { data, error } =
    await transactionsRepository.listCategorySuggestionHistory(
      input.householdId,
      input.transactionType,
      input.historyLimit,
    );
  if (error) throw error;

  const candidates = (data ?? []).flatMap((row) => {
    if (!row.category_id || !row.category) return [];
    return [
      {
        title: row.title,
        accountId: row.account_id,
        categoryId: row.category_id,
        categoryName: row.category.name,
        transactionDate: row.transaction_date,
        createdAt: row.created_at,
      },
    ];
  });

  return rankCategorySuggestion(title, candidates, input.accountId);
}
