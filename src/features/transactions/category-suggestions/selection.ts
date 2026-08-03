import type { CategorySuggestion } from "./types";

type ResolveCategorySelectionInput = {
  currentCategoryId: string | null;
  automatic: boolean;
  suggestion: CategorySuggestion | null | undefined;
};

/** Keeps manual choices intact and only applies high-confidence automatic matches. */
export function resolveCategorySelection({
  currentCategoryId,
  automatic,
  suggestion,
}: ResolveCategorySelectionInput): string | null {
  if (!automatic) return currentCategoryId;
  return suggestion?.confidence === "high" ? suggestion.categoryId : null;
}
