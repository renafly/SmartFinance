import {
  CATEGORY_PATH_SEPARATOR,
  groupRecurringExpensesByCategory,
  recurringExpenseGroupKey,
  type RecurringExpenseGroupItem,
} from "./recurring-expense-groups";

const categories = [
  { id: "housing", name: "Housing", parent_id: null },
  { id: "rent", name: "Rent", parent_id: "housing" },
  { id: "utilities", name: "Utilities", parent_id: null },
  { id: "subscriptions", name: "Subscriptions", parent_id: null },
];

function item(overrides: Partial<RecurringExpenseGroupItem> & { id: string }): RecurringExpenseGroupItem {
  return { name: overrides.id, amount: 10, categoryId: "utilities", isActive: true, ...overrides };
}

describe("groupRecurringExpensesByCategory", () => {
  it("groups expenses under their own category, sorted by label, with items sorted by name", () => {
    const groups = groupRecurringExpensesByCategory(
      [
        item({ id: "water", name: "Water", categoryId: "utilities", amount: 30 }),
        item({ id: "netflix", name: "Netflix", categoryId: "subscriptions", amount: 12 }),
        item({ id: "electricity", name: "Electricity", categoryId: "utilities", amount: 60 }),
        item({ id: "flat", name: "Flat", categoryId: "rent", amount: 900 }),
      ],
      categories,
      "en",
    );

    expect(groups.map((g) => g.label)).toEqual([`Housing${CATEGORY_PATH_SEPARATOR}Rent`, "Subscriptions", "Utilities"]);
    const utilities = groups.find((g) => g.categoryId === "utilities")!;
    expect(utilities.items.map((i) => i.name)).toEqual(["Electricity", "Water"]);
    expect(utilities.activeTotal).toBe(90);
  });

  it("never creates empty groups for categories with no recurring expenses", () => {
    const groups = groupRecurringExpensesByCategory([item({ id: "a", categoryId: "utilities" })], categories);
    expect(groups).toHaveLength(1);
    expect(groups[0].categoryId).toBe("utilities");
  });

  it("puts expenses whose category is missing/archived into one trailing uncategorized group", () => {
    const groups = groupRecurringExpensesByCategory(
      [item({ id: "gym", categoryId: "archived-cat" }), item({ id: "b", categoryId: "utilities" }), item({ id: "c", categoryId: "" })],
      categories,
    );
    expect(groups.map((g) => g.categoryId)).toEqual(["utilities", null]);
    expect(groups[1].items.map((i) => i.id).sort()).toEqual(["c", "gym"]);
    expect(recurringExpenseGroupKey(groups[1])).toBe("__uncategorized__");
  });

  it("only sums active (not paused) expenses into the group total", () => {
    const [group] = groupRecurringExpensesByCategory(
      [item({ id: "a", amount: 40 }), item({ id: "b", amount: 25, isActive: false })],
      categories,
    );
    expect(group.items).toHaveLength(2);
    expect(group.activeTotal).toBe(40);
  });

  it("uses the category id as a stable group key", () => {
    const [group] = groupRecurringExpensesByCategory([item({ id: "a" })], categories);
    expect(recurringExpenseGroupKey(group)).toBe("utilities");
  });
});
