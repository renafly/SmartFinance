import {
  normalizeTransactionTitle,
  transactionTitleTokens,
} from "./normalization";
import type { CategorySuggestion, CategorySuggestionCandidate } from "./types";

type RankedCandidate = CategorySuggestionCandidate & {
  similarity: number;
  exact: boolean;
};

function titleSimilarity(input: string, candidate: string): number {
  const normalizedInput = normalizeTransactionTitle(input);
  const normalizedCandidate = normalizeTransactionTitle(candidate);
  if (!normalizedInput || !normalizedCandidate) return 0;
  if (normalizedInput === normalizedCandidate) return 1;

  const inputTokens = new Set(transactionTitleTokens(input));
  const candidateTokens = new Set(transactionTitleTokens(candidate));
  const intersection = [...inputTokens].filter((token) =>
    candidateTokens.has(token),
  ).length;
  const union = new Set([...inputTokens, ...candidateTokens]).size;
  const tokenScore = union ? intersection / union : 0;
  const prefixScore =
    normalizedInput.startsWith(normalizedCandidate) ||
    normalizedCandidate.startsWith(normalizedInput)
      ? Math.min(normalizedInput.length, normalizedCandidate.length) /
        Math.max(normalizedInput.length, normalizedCandidate.length)
      : 0;

  return Math.max(tokenScore, prefixScore * 0.9);
}

export function rankCategorySuggestion(
  title: string,
  candidates: CategorySuggestionCandidate[],
  accountId?: string | null,
): CategorySuggestion | null {
  const normalizedTitle = normalizeTransactionTitle(title);
  if (normalizedTitle.length < 2) return null;

  const relevant: RankedCandidate[] = candidates
    .map((candidate) => {
      const similarity = titleSimilarity(title, candidate.title);
      return { ...candidate, similarity, exact: similarity === 1 };
    })
    .filter((candidate) => candidate.similarity >= 0.34);
  if (!relevant.length) return null;

  const grouped = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      rows: RankedCandidate[];
      score: number;
      latest: number;
    }
  >();

  relevant.forEach((candidate) => {
    const group = grouped.get(candidate.categoryId) ?? {
      categoryId: candidate.categoryId,
      categoryName: candidate.categoryName,
      rows: [],
      score: 0,
      latest: 0,
    };
    group.rows.push(candidate);
    group.score +=
      candidate.similarity * 10 +
      (candidate.exact ? 8 : 0) +
      (accountId && candidate.accountId === accountId ? 1.5 : 0);
    group.latest = Math.max(
      group.latest,
      Date.parse(candidate.transactionDate || candidate.createdAt) || 0,
    );
    grouped.set(candidate.categoryId, group);
  });

  const ranked = [...grouped.values()].sort(
    (left, right) =>
      right.score - left.score ||
      right.rows.length - left.rows.length ||
      right.latest - left.latest,
  );
  const winner = ranked[0];
  const exactCount = winner.rows.filter((row) => row.exact).length;
  const exactTotal = relevant.filter((row) => row.exact).length;
  const bestSimilarity = Math.max(...winner.rows.map((row) => row.similarity));
  const dominance = winner.rows.length / relevant.length;

  if (exactCount > 0 && exactCount / exactTotal >= 0.75) {
    return {
      categoryId: winner.categoryId,
      categoryName: winner.categoryName,
      confidence: "high",
      matchCount: exactCount,
      reason: "exact-title",
    };
  }

  const confidence =
    bestSimilarity >= 0.45 && dominance >= 0.6 ? "medium" : "low";
  return {
    categoryId: winner.categoryId,
    categoryName: winner.categoryName,
    confidence,
    matchCount: winner.rows.length,
    reason: confidence === "medium" ? "similar-title" : "weak-match",
  };
}
