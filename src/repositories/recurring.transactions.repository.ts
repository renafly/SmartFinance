import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RecurringTransaction =
  Database["public"]["Tables"]["recurring_transactions"]["Row"];
export type RecurringRunExecution =
  Database["public"]["Tables"]["recurring_run_executions"]["Row"];

export type RecurringTransactionWithRelations = RecurringTransaction & {
  account: Pick<Database["public"]["Tables"]["accounts"]["Row"], "id" | "name"> | null;
  category: Pick<Database["public"]["Tables"]["categories"]["Row"], "id" | "name" | "icon"> | null;
  destination_account: Pick<Database["public"]["Tables"]["accounts"]["Row"], "id" | "name"> | null;
  destination_pot: Pick<Database["public"]["Tables"]["saving_pots"]["Row"], "id" | "name"> | null;
};

const RECURRING_WITH_RELATIONS_SELECT =
  "*, account:accounts!recurring_transactions_account_id_fkey(id, name), category:categories(id, name, icon), destination_account:accounts!recurring_transactions_destination_account_id_fkey(id, name), destination_pot:saving_pots!recurring_transactions_destination_pot_id_fkey(id, name)";

export class RecurringTransactionsRepository extends BaseRepository<"recurring_transactions"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "recurring_transactions");
  }

  async listForHousehold(
    householdId: string,
    activeOnly = true,
  ): Promise<RepoResult<RecurringTransactionWithRelations[]>> {
    let query = this.client
      .from("recurring_transactions")
      .select(RECURRING_WITH_RELATIONS_SELECT)
      .eq("household_id", householdId)
      .order("next_run", { ascending: true });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { data: null, error };
    return {
      data: (data ?? []) as unknown as RecurringTransactionWithRelations[],
      error: null,
    };
  }

  /** Active recurring transactions whose next_run is on or before the given date (defaults to now). */
  async listDue(
    householdId: string,
    asOf: string = new Date().toISOString(),
  ): Promise<RepoResult<RecurringTransaction[]>> {
    const { data, error } = await this.client
      .from("recurring_transactions")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .lte("next_run", asOf)
      .order("next_run", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** Updates last_run/next_run after generating a transaction from this recurring rule. */
  async markRun(
    id: string,
    lastRun: string,
    nextRun: string,
  ): Promise<RepoResult<RecurringTransaction>> {
    return this.update(id, { last_run: lastRun, next_run: nextRun });
  }

  async deactivate(id: string): Promise<RepoResult<RecurringTransaction>> {
    return this.update(id, { is_active: false });
  }

  async activate(id: string): Promise<RepoResult<RecurringTransaction>> {
    return this.update(id, { is_active: true });
  }

  async listExecutions(
    recurringTransactionId: string,
  ): Promise<RepoResult<RecurringRunExecution[]>> {
    const { data, error } = await this.client
      .from("recurring_run_executions")
      .select("*")
      .eq("recurring_transaction_id", recurringTransactionId)
      .order("scheduled_for", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }
}
