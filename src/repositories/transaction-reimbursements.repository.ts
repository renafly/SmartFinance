import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionReimbursement =
  Database["public"]["Tables"]["transaction_reimbursements"]["Row"];
export type TransactionEffectiveAmount =
  Database["public"]["Views"]["transaction_effective_amounts"]["Row"];

/**
 * Third-party repayments toward one expense transaction (1:N), plus the
 * read-only `transaction_effective_amounts` view (original amount minus
 * reimbursements, can go negative). See
 * docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2 and
 * supabase/migrations/20260901000400_transaction_reimbursements.sql.
 *
 * Unlike transaction_allocations (which replaces the whole set through an
 * RPC that has to keep a sum invariant), reimbursement rows are
 * independent of one another -- there's no "must sum to X" constraint to
 * enforce atomically -- so plain RLS-scoped CRUD is enough here.
 */
export class TransactionReimbursementsRepository extends BaseRepository<"transaction_reimbursements"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "transaction_reimbursements");
  }

  async listForTransaction(
    transactionId: string,
  ): Promise<RepoResult<TransactionReimbursement[]>> {
    const { data, error } = await this.client
      .from("transaction_reimbursements")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Bulk effective-amounts lookup for a household, so a transactions list
   * can decorate every row (original amount struck through, effective
   * amount, over-reimbursed badge) with a single query instead of one
   * request per row. Only rows that actually have a reimbursement are
   * useful to the caller, so amount-unaffected rows (reimbursed_total = 0)
   * are filtered out server-side.
   */
  async listEffectiveAmountsForHousehold(
    householdId: string,
  ): Promise<RepoResult<TransactionEffectiveAmount[]>> {
    const { data, error } = await this.client
      .from("transaction_effective_amounts")
      .select("*")
      .eq("household_id", householdId)
      .neq("reimbursed_total", 0);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async getEffectiveAmount(
    transactionId: string,
  ): Promise<RepoResult<TransactionEffectiveAmount | null>> {
    const { data, error } = await this.client
      .from("transaction_effective_amounts")
      .select("*")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: data ?? null, error: null };
  }
}
