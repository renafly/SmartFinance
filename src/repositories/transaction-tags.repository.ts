import { BaseRepository, type RepoResult } from "@/repositories/base.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionTagRow = Database["public"]["Tables"]["transaction_tags"]["Row"];
export type TransactionTagSummaryRow =
  Database["public"]["Functions"]["summarize_transaction_tags"]["Returns"][number];
export type TransactionTagTransactionRow =
  Database["public"]["Functions"]["list_transaction_tag_transactions"]["Returns"][number];

export type TagDateRange = {
  /** Inclusive "YYYY-MM-DD" lower bound on transaction_date. */
  from?: string | null;
  /** Inclusive "YYYY-MM-DD" upper bound on transaction_date. */
  to?: string | null;
};

/**
 * Household expense tags -- the user-facing "Tags" feature, built on the
 * pre-existing transaction_tags / transaction_tag_assignments schema
 * (20260731174334_transaction_automation.sql) plus the aggregate/atomic
 * RPCs in 20260928000000_transaction_tag_totals.sql. `create`/`update`/
 * `delete` are inherited from BaseRepository unchanged: deleting a tag
 * cascades only its assignment rows, never a transaction.
 */
export class TransactionTagsRepository extends BaseRepository<"transaction_tags"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "transaction_tags");
  }

  async listForHousehold(householdId: string): Promise<RepoResult<TransactionTagRow[]>> {
    const { data, error } = await this.client
      .from("transaction_tags")
      .select("*")
      .eq("household_id", householdId)
      .order("name", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /** One row per tag (including tags with zero transactions in the range). */
  async summarize(
    householdId: string,
    range: TagDateRange = {},
  ): Promise<RepoResult<TransactionTagSummaryRow[]>> {
    const { data, error } = await this.client.rpc("summarize_transaction_tags", {
      p_household_id: householdId,
      p_from: range.from ?? undefined,
      p_to: range.to ?? undefined,
    });

    if (error) return { data: null, error };
    return { data: (data ?? []) as TransactionTagSummaryRow[], error: null };
  }

  async listTagTransactions(
    householdId: string,
    tagId: string,
    range: TagDateRange = {},
  ): Promise<RepoResult<TransactionTagTransactionRow[]>> {
    const { data, error } = await this.client.rpc("list_transaction_tag_transactions", {
      p_household_id: householdId,
      p_tag_id: tagId,
      p_from: range.from ?? undefined,
      p_to: range.to ?? undefined,
    });

    if (error) return { data: null, error };
    return { data: (data ?? []) as TransactionTagTransactionRow[], error: null };
  }

  async listTagIdsForTransaction(transactionId: string): Promise<RepoResult<string[]>> {
    const { data, error } = await this.client
      .from("transaction_tag_assignments")
      .select("tag_id")
      .eq("transaction_id", transactionId);

    if (error) return { data: null, error };
    return { data: (data ?? []).map((row) => row.tag_id), error: null };
  }

  /** Atomically replaces a transaction's tags (empty array = remove all). */
  async setTransactionTags(
    transactionId: string,
    tagIds: readonly string[],
  ): Promise<RepoResult<number>> {
    const { data, error } = await this.client.rpc("set_transaction_tags", {
      p_transaction_id: transactionId,
      p_tag_ids: [...tagIds],
    });

    if (error) return { data: null, error };
    return { data: Number(data ?? 0), error: null };
  }
}
