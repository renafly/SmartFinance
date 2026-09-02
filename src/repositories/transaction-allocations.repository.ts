import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionAllocation =
  Database["public"]["Tables"]["transaction_allocations"]["Row"];

export type SaveTransactionAllocationInput = {
  source_type: "account" | "pot";
  account_id: string | null;
  pot_id: string | null;
  amount: number;
};

/**
 * Thin wrapper for the split-transaction funding-source breakdown. Reads go
 * straight against the table (RLS-scoped); every write goes through the
 * save_transaction_allocations RPC, which is the only path that validates
 * "sums to the transaction amount", "no duplicate source", and "no
 * pot + its own backing account on the same transaction" -- see
 * docs/split-transactions-plan.md.
 */
export class TransactionAllocationsRepository extends BaseRepository<"transaction_allocations"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "transaction_allocations");
  }

  async listForTransaction(
    transactionId: string,
  ): Promise<RepoResult<TransactionAllocation[]>> {
    const { data, error } = await this.client
      .from("transaction_allocations")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Bulk variant of `listForTransaction` for callers that need allocation
   * breakdowns for many transactions at once (e.g. expanding a batch of
   * split transactions into per-account legs for Wage Flow / insights
   * calculations) without an N+1 round trip per transaction. Returns rows
   * for every id in `transactionIds` that has any allocations -- ids for
   * non-split transactions simply have no rows in the result.
   */
  async listForTransactionIds(
    transactionIds: string[],
  ): Promise<RepoResult<TransactionAllocation[]>> {
    if (transactionIds.length === 0) return { data: [], error: null };

    const { data, error } = await this.client
      .from("transaction_allocations")
      .select("*")
      .in("transaction_id", transactionIds)
      .order("sort_order", { ascending: true });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  /**
   * Replaces every allocation row for `transactionId`. Pass an empty array
   * to convert a split transaction back to a single (non-split) source.
   */
  async save(
    transactionId: string,
    allocations: SaveTransactionAllocationInput[],
  ): Promise<RepoResult<null>> {
    const { error } = await this.client.rpc("save_transaction_allocations", {
      p_transaction_id: transactionId,
      p_allocations: allocations,
    });

    if (error) return { data: null, error };
    return { data: null, error: null };
  }
}
