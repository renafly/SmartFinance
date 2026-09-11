import { repositories } from "@/repositories";
import type { CategoryBudgetRow } from "@/repositories/category-budgets.repository";

import type { CategoryBudget, CategoryBudgetDraft } from "../types";

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/** Normalizes any "YYYY-MM" or full ISO date string to a first-of-month "YYYY-MM-01" column value. */
function toMonthColumn(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function rowToCategoryBudget(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    householdId: row.household_id,
    categoryId: row.category_id,
    amount: row.amount,
    effectiveMonth: row.effective_month,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

class CategoryBudgetsService {
  /**
   * Every category_budgets row for the household effective at or before
   * `month`, across every category -- the raw material
   * resolveActiveCategoryBudgets (category-budget-view-model.ts) reduces
   * down to "the one active limit per category" client-side. Not reduced
   * here so the pure calc module stays the single place that decision is
   * made, testable without a network call.
   */
  async getEffectiveBudgets(householdId: string, month: string): Promise<CategoryBudget[]> {
    const { data, error } = await repositories.categoryBudgets.listEffectiveForMonth(
      householdId,
      toMonthColumn(month),
    );
    if (error) throw error;
    return (data ?? []).map(rowToCategoryBudget);
  }

  /**
   * Sets a category's limit effective from `draft.effectiveMonth`
   * onward. Changing the limit for a LATER month is always a brand new
   * row (a fresh (category_id, effective_month) pair), leaving every
   * earlier month's row untouched -- that's what keeps an
   * already-reported month reading the limit that was active for it.
   * Re-saving the SAME (category_id, effective_month) pair -- e.g. the
   * user edits a not-yet-started month's limit a second time via the
   * pencil icon before it takes effect -- upserts that one row in place
   * rather than hitting the table's unique(category_id, effective_month)
   * constraint as a raw duplicate-key error (see
   * CategoryBudgetsRepository.upsert and the migration's own comment).
   */
  async setCategoryBudget(
    draft: CategoryBudgetDraft,
    context: { householdId: string; createdBy: string },
  ): Promise<CategoryBudget> {
    const amount = roundMoney(Number(draft.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Category budget amount must be greater than zero.");
    }

    const { data, error } = await repositories.categoryBudgets.upsert({
      household_id: context.householdId,
      category_id: draft.categoryId,
      amount,
      effective_month: toMonthColumn(draft.effectiveMonth),
      created_by: context.createdBy,
    });
    if (error) throw error;
    return rowToCategoryBudget(data);
  }
}

export const categoryBudgetsService = new CategoryBudgetsService();
