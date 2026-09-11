import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RecurringExpense = Database["public"]["Tables"]["recurring_expenses"]["Row"];
export type RecurringExpenseInsert = Database["public"]["Tables"]["recurring_expenses"]["Insert"];
export type RecurringExpenseUpdate = Database["public"]["Tables"]["recurring_expenses"]["Update"];
export type RecurringExpenseMatch = Database["public"]["Tables"]["recurring_expense_matches"]["Row"];

export type RecurringExpenseWithRelations = RecurringExpense & {
  account: Pick<Database["public"]["Tables"]["accounts"]["Row"], "id" | "name"> | null;
  category:
    | Pick<Database["public"]["Tables"]["categories"]["Row"], "id" | "name" | "icon" | "parent_id">
    | null;
};

const RECURRING_EXPENSE_WITH_RELATIONS_SELECT =
  "*, account:accounts(id, name), category:categories(id, name, icon, parent_id)";

/**
 * Forecast-only recurring/planned expenses shown in the Monthly Budget
 * overview (see supabase/migrations/20260901000800_recurring_expense_forecasts.sql).
 * Deliberately a plain CRUD table -- there is no server-side scheduler here
 * the way `recurring_transactions` has `execute_due_recurring_movements`;
 * "is this expense due in month X" is computed client-side (see
 * src/features/recurring-expenses/utils.ts), matching how
 * `budget_rules.active_months` month-applicability is already computed in
 * monthly-budget.service.ts.
 */
export class RecurringExpensesRepository extends BaseRepository<"recurring_expenses"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "recurring_expenses");
  }

  async listForHousehold(
    householdId: string,
  ): Promise<RepoResult<RecurringExpenseWithRelations[]>> {
    const { data, error } = await this.client
      .from("recurring_expenses")
      .select(RECURRING_EXPENSE_WITH_RELATIONS_SELECT)
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) return { data: null, error };
    return {
      data: (data ?? []) as unknown as RecurringExpenseWithRelations[],
      error: null,
    };
  }

  async softDelete(id: string): Promise<RepoResult<RecurringExpense>> {
    return this.update(id, { deleted_at: new Date().toISOString() });
  }

  async setPaused(id: string, isPaused: boolean): Promise<RepoResult<RecurringExpense>> {
    return this.update(id, { is_paused: isPaused });
  }

  /** All matches for a set of recurring expenses -- used to mark which forecast occurrences already have a linked real transaction. */
  async listMatches(
    recurringExpenseIds: string[],
  ): Promise<RepoResult<RecurringExpenseMatch[]>> {
    if (recurringExpenseIds.length === 0) return { data: [], error: null };

    const { data, error } = await this.client
      .from("recurring_expense_matches")
      .select("*")
      .in("recurring_expense_id", recurringExpenseIds);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** Links (or re-links) a real transaction to a planned occurrence. One occurrence <-> one transaction, enforced by unique constraints on the table. */
  async matchOccurrence(
    recurringExpenseId: string,
    occurrenceMonth: string,
    transactionId: string,
    matchedBy: string,
  ): Promise<RepoResult<RecurringExpenseMatch>> {
    const { data, error } = await this.client
      .from("recurring_expense_matches")
      .upsert(
        {
          recurring_expense_id: recurringExpenseId,
          occurrence_month: occurrenceMonth,
          transaction_id: transactionId,
          matched_by: matchedBy,
        },
        { onConflict: "recurring_expense_id,occurrence_month" },
      )
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  }

  async unmatchOccurrence(
    recurringExpenseId: string,
    occurrenceMonth: string,
  ): Promise<RepoResult<null>> {
    const { error } = await this.client
      .from("recurring_expense_matches")
      .delete()
      .eq("recurring_expense_id", recurringExpenseId)
      .eq("occurrence_month", occurrenceMonth);

    if (error) return { data: null, error };
    return { data: null, error: null };
  }
}
