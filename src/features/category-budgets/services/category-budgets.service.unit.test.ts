const mockDeleteForCategory = jest.fn();

jest.mock("@/repositories", () => ({
  repositories: {
    categoryBudgets: {
      deleteForCategory: (...args: unknown[]) => mockDeleteForCategory(...args),
    },
  },
}));

import { categoryBudgetsService } from "./category-budgets.service";

describe("categoryBudgetsService.deleteCategoryBudget", () => {
  beforeEach(() => {
    mockDeleteForCategory.mockReset();
  });

  it("deletes only that category's budget rows, scoped to the household", async () => {
    mockDeleteForCategory.mockResolvedValue({ data: [{ id: "b1" }, { id: "b2" }], error: null });

    await expect(categoryBudgetsService.deleteCategoryBudget("cat-food", "household-1")).resolves.toBe(2);
    expect(mockDeleteForCategory).toHaveBeenCalledTimes(1);
    expect(mockDeleteForCategory).toHaveBeenCalledWith("household-1", "cat-food");
  });

  it("throws when nothing was deleted (e.g. blocked by RLS) so the UI never reports a delete that did not persist", async () => {
    mockDeleteForCategory.mockResolvedValue({ data: [], error: null });
    await expect(categoryBudgetsService.deleteCategoryBudget("cat-food", "household-1")).rejects.toThrow();
  });

  it("surfaces repository errors", async () => {
    mockDeleteForCategory.mockResolvedValue({ data: null, error: new Error("permission denied") });
    await expect(categoryBudgetsService.deleteCategoryBudget("cat-food", "household-1")).rejects.toThrow("permission denied");
  });

  it("refuses to run without a category or household id", async () => {
    await expect(categoryBudgetsService.deleteCategoryBudget("", "household-1")).rejects.toThrow();
    await expect(categoryBudgetsService.deleteCategoryBudget("cat-food", "")).rejects.toThrow();
    expect(mockDeleteForCategory).not.toHaveBeenCalled();
  });
});
