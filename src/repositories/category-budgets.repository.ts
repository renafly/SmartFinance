import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryBudgetRow = Database["public"]["Tables"]["category_budgets"]["Row"];

/**
 * CRUD for category_budgets, plus one bespoke read: every row at or
 * before a given month, for the client-side "active limit per category"
 * resolution in category-budget-view-model.ts's
 * `resolveActiveCategoryBudgets`. `create`/`delete` are inherited from
 * BaseRepository unchanged -- there is no `update`, by design: the
 * effective-month model means changing a limit is always a new insert,
 * never an in-place update (see the migration's own comment).
 */
export class CategoryBudgetsRepository extends BaseRepository<"category_budgets"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "category_budgets");
  }

  /**
   * Sets a category's limit for one (category_id, effective_month) --
   * upserts on the table's own unique(category_id, effective_month)
   * constraint instead of a plain insert. The migration's own comment
   * on that constraint says the app should upsert against a same-month
   * re-edit rather than let it surface as a raw duplicate-key error;
   * `create` (inherited from BaseRepository) does a plain insert and
   * does NOT do this -- callers that want "change this month's limit
   * again before it starts" to just work (not throw) must call this,
   * not `create`. Any other effective_month row for the same category
   * is untouched either way.
   */
  async upsert(
    values: Database["public"]["Tables"]["category_budgets"]["Insert"],
  ): Promise<RepoResult<CategoryBudgetRow>> {
    const { data, error } = await this.client
      .from("category_budgets")
      .upsert(values as any, { onConflict: "category_id,effective_month" })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as unknown as CategoryBudgetRow, error: null };
  }

  /**
   * Every category_budgets row for the household with
   * effective_month <= month, across every category, newest-first per
   * category. Deliberately not filtered to a single category or reduced
   * to "just the active one" here -- resolveActiveCategoryBudgets (the
   * pure calc side) needs the full effective-dated history up to `month`
   * to pick the right row per category, and doing that reduction
   * client-side keeps this repository a plain read with no bespoke SQL.
   */
  async listEffectiveForMonth(
    householdId: string,
    month: string,
  ): Promise<RepoResult<CategoryBudgetRow[]>> {
    const { data, error } = await this.client
      .from("category_budgets")
      .select("*")
      .eq("household_id", householdId)
      .lte("effective_month", month)
      .order("effective_month", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }
}
