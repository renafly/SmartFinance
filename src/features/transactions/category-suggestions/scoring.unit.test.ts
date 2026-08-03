import { normalizeTransactionTitle } from "./normalization";
import { rankCategorySuggestion } from "./scoring";
import type { CategorySuggestionCandidate } from "./types";

function candidate(
  overrides: Partial<CategorySuggestionCandidate> = {},
): CategorySuggestionCandidate {
  return {
    title: "Continente Colombo",
    accountId: "account-1",
    categoryId: "groceries",
    categoryName: "Groceries",
    transactionDate: "2026-07-30",
    createdAt: "2026-07-30T10:00:00Z",
    ...overrides,
  };
}

describe("transaction category suggestions", () => {
  it("normalizes Portuguese diacritics, punctuation, case, and whitespace", () => {
    expect(normalizeTransactionTitle("  CAFÉ—São   Bento! ")).toBe(
      "cafe sao bento",
    );
  });

  it("returns a high-confidence exact normalized match", () => {
    expect(
      rankCategorySuggestion("CONTINENTE, COLOMBO", [candidate()]),
    ).toEqual({
      categoryId: "groceries",
      categoryName: "Groceries",
      confidence: "high",
      matchCount: 1,
      reason: "exact-title",
    });
  });

  it("uses frequency to rank conflicting exact history without overclaiming confidence", () => {
    const result = rankCategorySuggestion("Continente Colombo", [
      candidate(),
      candidate({ transactionDate: "2026-07-20" }),
      candidate({
        categoryId: "other",
        categoryName: "Other",
        accountId: "account-2",
      }),
    ]);
    expect(result).toMatchObject({
      categoryId: "groceries",
      confidence: "medium",
      matchCount: 2,
    });
  });

  it("finds strong prefix and token similarity", () => {
    expect(rankCategorySuggestion("Continente", [candidate()])).toMatchObject({
      categoryId: "groceries",
      confidence: "medium",
      reason: "similar-title",
    });
  });

  it("uses same-account history as a ranking boost", () => {
    const result = rankCategorySuggestion(
      "Coffee Shop",
      [
        candidate({
          title: "Coffee Shop",
          categoryId: "food",
          categoryName: "Food",
          accountId: "account-1",
        }),
        candidate({
          title: "Coffee Shop",
          categoryId: "work",
          categoryName: "Work",
          accountId: "account-2",
        }),
      ],
      "account-2",
    );
    expect(result?.categoryId).toBe("work");
  });

  it("returns null for empty or unrelated history", () => {
    expect(rankCategorySuggestion("", [candidate()])).toBeNull();
    expect(rankCategorySuggestion("Electricity", [candidate()])).toBeNull();
  });
});
