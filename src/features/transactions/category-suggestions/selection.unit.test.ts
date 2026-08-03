import { resolveCategorySelection } from "./selection";

const suggestion = {
  categoryId: "groceries",
  categoryName: "Groceries",
  matchCount: 4,
  reason: "exact-title" as const,
};

describe("resolveCategorySelection", () => {
  it("preselects a high-confidence suggestion in automatic mode", () => {
    expect(
      resolveCategorySelection({
        currentCategoryId: null,
        automatic: true,
        suggestion: { ...suggestion, confidence: "high" },
      }),
    ).toBe("groceries");
  });

  it("shows medium confidence without selecting it", () => {
    expect(
      resolveCategorySelection({
        currentCategoryId: null,
        automatic: true,
        suggestion: { ...suggestion, confidence: "medium" },
      }),
    ).toBeNull();
  });

  it("never overwrites a manual category", () => {
    expect(
      resolveCategorySelection({
        currentCategoryId: "manual-choice",
        automatic: false,
        suggestion: { ...suggestion, confidence: "high" },
      }),
    ).toBe("manual-choice");
  });

  it("clears a previous automatic choice when no confident match remains", () => {
    expect(
      resolveCategorySelection({
        currentCategoryId: "old-automatic-choice",
        automatic: true,
        suggestion: null,
      }),
    ).toBeNull();
  });
});
