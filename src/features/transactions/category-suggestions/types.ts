import type { Database } from "@/types/database.types";

export type TransactionType = Database["public"]["Enums"]["transaction_type"];
export type CategorySuggestionConfidence = "high" | "medium" | "low";

export type CategorySuggestionCandidate = {
  title: string;
  accountId: string;
  categoryId: string;
  categoryName: string;
  transactionDate: string;
  createdAt: string;
};

export type CategorySuggestion = {
  categoryId: string;
  categoryName: string;
  confidence: CategorySuggestionConfidence;
  matchCount: number;
  reason: "exact-title" | "similar-title" | "weak-match";
};

export type SuggestCategoryInput = {
  householdId: string;
  transactionType: TransactionType;
  title: string;
  accountId?: string | null;
  historyLimit?: number;
};
