/**
 * Category budgets / limits -- a monthly spending limit per category,
 * shown alongside real spend + still-unpaid planned/recurring expenses
 * for that category (see services/category-budget-view-model.ts, the one
 * place all of this feature's money math lives).
 *
 * Deliberately does NOT introduce a second recurring-expense model: the
 * "planned/recurring expenses inside the budget" requirement is served
 * entirely by the existing planned_items/planned_item_occurrences/
 * planned_item_matches system (see src/features/planned-items) -- this
 * feature only adds the limit itself (`category_budgets`) and the
 * calculation that combines it with data those other features (and
 * plain `transactions`) already produce.
 */

/** Row <-> camelCase mirror of category_budgets, same rowToX() convention as planned-items.service.ts. */
export type CategoryBudget = {
  id: string;
  householdId: string;
  categoryId: string;
  amount: number;
  /** "YYYY-MM-01". */
  effectiveMonth: string;
  createdBy: string | null;
  createdAt: string;
};

/** Draft for setting/changing a category's limit -- string-valued amount, same still-being-typed-form convention as PlannedItemDraft. */
export type CategoryBudgetDraft = {
  categoryId: string;
  amount: string;
  /** "YYYY-MM" -- the month this new limit becomes effective from. */
  effectiveMonth: string;
};
