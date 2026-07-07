import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RecurringTransaction =
  Database["public"]["Tables"]["recurring_transactions"]["Row"];

export class RecurringTransactionsRepository extends BaseRepository<"recurring_transactions"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "recurring_transactions");
  }

  async listForHousehold(
    householdId: string,
    activeOnly = true,
  ): Promise<RepoResult<RecurringTransaction[]>> {
    let query = this.client
      .from("recurring_transactions")
      .select("*, account:accounts(id, name), category:categories(id, name, icon)")
      .eq("household_id", householdId)
      .order("next_run", { ascending: true });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: (data ?? []) as any, error: null };
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
}
