import { normalizeTransactionTitle } from "../category-suggestions/normalization";

export type TransactionTitleHistory = {
  title: string;
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
  transactionDate: string;
  createdAt: string;
};

export type TransactionTitleSuggestion = {
  title: string;
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
  usageCount: number;
};

export function rankTransactionTitleSuggestions(
  input: string,
  history: readonly TransactionTitleHistory[],
  accountId?: string | null,
  limit = 5,
): TransactionTitleSuggestion[] {
  const query = normalizeTransactionTitle(input);
  if (query.length < 2) return [];

  const groups = new Map<
    string,
    TransactionTitleSuggestion & {
      latest: number;
      matchRank: number;
      accountMatches: number;
    }
  >();

  for (const row of history) {
    const normalized = normalizeTransactionTitle(row.title);
    const words = normalized.split(" ");
    const matchRank = normalized.startsWith(query)
      ? 0
      : words.some((word) => word.startsWith(query))
        ? 1
        : normalized.includes(query)
          ? 2
          : -1;
    if (matchRank < 0) continue;

    const timestamp = Date.parse(row.transactionDate || row.createdAt) || 0;
    const existing = groups.get(normalized);
    if (!existing) {
      groups.set(normalized, {
        title: row.title.trim(),
        accountId: row.accountId,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        usageCount: 1,
        latest: timestamp,
        matchRank,
        accountMatches: accountId && row.accountId === accountId ? 1 : 0,
      });
      continue;
    }

    existing.usageCount += 1;
    existing.matchRank = Math.min(existing.matchRank, matchRank);
    if (accountId && row.accountId === accountId) existing.accountMatches += 1;
    if (timestamp > existing.latest) {
      existing.title = row.title.trim();
      existing.accountId = row.accountId;
      existing.categoryId = row.categoryId;
      existing.categoryName = row.categoryName;
      existing.latest = timestamp;
    }
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        left.matchRank - right.matchRank ||
        right.accountMatches - left.accountMatches ||
        right.usageCount - left.usageCount ||
        right.latest - left.latest ||
        left.title.localeCompare(right.title),
    )
    .slice(0, Math.max(0, limit))
    .map(
      ({
        latest: _latest,
        matchRank: _rank,
        accountMatches: _matches,
        ...item
      }) => item,
    );
}
