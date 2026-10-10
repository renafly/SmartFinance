import { buildTagCategoryBreakdown } from "./tag-category-breakdown";
import type { TagTransaction } from "../types";

function tx(overrides: Partial<TagTransaction> & { id: string }): TagTransaction {
  return {
    date: "2026-10-01",
    title: "Expense",
    notes: null,
    amount: overrides.netAmount ?? 0,
    reimbursedTotal: 0,
    netAmount: 0,
    isSplit: false,
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    accountId: "acc",
    accountName: "Account",
    createdBy: "user",
    createdByName: "User",
    ...overrides,
  };
}

const OPTIONS = { maxSlices: 3, uncategorizedLabel: "Uncategorized", otherLabel: "Other" };

describe("buildTagCategoryBreakdown", () => {
  it("groups by category and sorts largest first", () => {
    const result = buildTagCategoryBreakdown(
      [
        [
          tx({ id: "1", netAmount: 10, categoryId: "food", categoryName: "Food" }),
          tx({ id: "2", netAmount: 30, categoryId: "travel", categoryName: "Travel" }),
          tx({ id: "3", netAmount: 5.5, categoryId: "food", categoryName: "Food" }),
        ],
      ],
      OPTIONS,
    );
    expect(result.total).toBe(45.5);
    expect(result.transactionCount).toBe(3);
    expect(result.slices.map((s) => [s.key, s.value, s.transactionCount])).toEqual([
      ["travel", 30, 1],
      ["food", 15.5, 2],
    ]);
  });

  it("counts an expense with several tags only once", () => {
    const shared = tx({ id: "shared", netAmount: 100, categoryId: "travel", categoryName: "Travel" });
    const result = buildTagCategoryBreakdown(
      [[shared, tx({ id: "a", netAmount: 20, categoryId: "food", categoryName: "Food" })], [shared]],
      OPTIONS,
    );
    expect(result.total).toBe(120);
    expect(result.slices[0]).toMatchObject({ key: "travel", value: 100, transactionCount: 1 });
  });

  it("labels missing categories as uncategorized and skips fully reimbursed rows", () => {
    const result = buildTagCategoryBreakdown(
      [
        [
          tx({ id: "1", netAmount: 8 }),
          tx({ id: "2", netAmount: 0, categoryId: "food", categoryName: "Food" }),
          tx({ id: "3", netAmount: -4, categoryId: "food", categoryName: "Food" }),
        ],
        undefined,
      ],
      OPTIONS,
    );
    expect(result.total).toBe(8);
    expect(result.slices).toEqual([
      { key: "uncategorized", label: "Uncategorized", icon: null, value: 8, transactionCount: 1 },
    ]);
  });

  it("folds the tail into an Other slice beyond maxSlices", () => {
    const result = buildTagCategoryBreakdown(
      [
        [
          tx({ id: "1", netAmount: 50, categoryId: "a", categoryName: "A" }),
          tx({ id: "2", netAmount: 40, categoryId: "b", categoryName: "B" }),
          tx({ id: "3", netAmount: 0.1, categoryId: "c", categoryName: "C" }),
          tx({ id: "4", netAmount: 0.2, categoryId: "d", categoryName: "D" }),
        ],
      ],
      OPTIONS,
    );
    expect(result.slices.map((s) => [s.key, s.value])).toEqual([
      ["a", 50],
      ["b", 40],
      ["other", 0.3],
    ]);
    expect(result.total).toBe(90.3);
  });

  it("does not fold when the categories fit exactly", () => {
    const result = buildTagCategoryBreakdown(
      [
        [
          tx({ id: "1", netAmount: 3, categoryId: "a", categoryName: "A" }),
          tx({ id: "2", netAmount: 2, categoryId: "b", categoryName: "B" }),
          tx({ id: "3", netAmount: 1, categoryId: "c", categoryName: "C" }),
        ],
      ],
      OPTIONS,
    );
    expect(result.slices.map((s) => s.key)).toEqual(["a", "b", "c"]);
  });
});
