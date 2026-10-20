/**
 * Groups the Category Budgets screen's recurring expenses under their
 * categories. Pure (no React, no i18n) so the grouping rules are unit-tested
 * on their own -- RecurringExpensesCard only renders what this returns.
 *
 * Rules:
 * - one group per category the expenses actually use (no empty groups);
 * - a subcategory's label is "Parent › Child", so two subcategories with the
 *   same name under different parents stay distinguishable;
 * - an expense whose category isn't in `categories` (archived/deleted) lands
 *   in a single trailing "uncategorized" group (`categoryId: null`) instead
 *   of disappearing;
 * - groups are sorted by label, expenses inside a group by name;
 * - `activeTotal` sums only active (not paused) expenses.
 */

export type RecurringExpenseGroupCategory = {
  id: string;
  name: string;
  parent_id?: string | null;
};

export type RecurringExpenseGroupItem = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  isActive: boolean;
};

export type RecurringExpenseGroup<T extends RecurringExpenseGroupItem> = {
  /** Null for the "uncategorized" group. */
  categoryId: string | null;
  /** Display label ("Parent › Child" for a subcategory). Empty for the uncategorized group -- the caller supplies a translated label. */
  label: string;
  items: T[];
  activeTotal: number;
};

export const CATEGORY_PATH_SEPARATOR = " › ";

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function groupRecurringExpensesByCategory<T extends RecurringExpenseGroupItem>(
  items: readonly T[],
  categories: readonly RecurringExpenseGroupCategory[],
  locale?: string,
): RecurringExpenseGroup<T>[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const compare = (a: string, b: string) => a.localeCompare(b, locale, { sensitivity: "base" });

  function labelFor(categoryId: string): string | null {
    const category = categoriesById.get(categoryId);
    if (!category) return null;
    const parent = category.parent_id ? categoriesById.get(category.parent_id) : undefined;
    return parent ? `${parent.name}${CATEGORY_PATH_SEPARATOR}${category.name}` : category.name;
  }

  const groupsByKey = new Map<string, RecurringExpenseGroup<T>>();
  let uncategorized: RecurringExpenseGroup<T> | null = null;

  for (const item of items) {
    const label = item.categoryId ? labelFor(item.categoryId) : null;
    let group: RecurringExpenseGroup<T>;
    if (label === null) {
      uncategorized ??= { categoryId: null, label: "", items: [], activeTotal: 0 };
      group = uncategorized;
    } else {
      group = groupsByKey.get(item.categoryId) ?? { categoryId: item.categoryId, label, items: [], activeTotal: 0 };
      groupsByKey.set(item.categoryId, group);
    }
    group.items.push(item);
    if (item.isActive) group.activeTotal = roundMoney(group.activeTotal + (Number(item.amount) || 0));
  }

  const groups = [...groupsByKey.values()].sort((a, b) => compare(a.label, b.label));
  if (uncategorized) groups.push(uncategorized);
  for (const group of groups) {
    group.items.sort((a, b) => compare(a.name, b.name));
  }
  return groups;
}

/** Stable key for a group's collapsed/expanded state (the uncategorized group has no category id). */
export function recurringExpenseGroupKey(group: { categoryId: string | null }): string {
  return group.categoryId ?? "__uncategorized__";
}
