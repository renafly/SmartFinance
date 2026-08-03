import type { RepoResult } from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Rule = Database["public"]["Tables"]["transaction_rules"]["Row"];
type RuleInsert = Database["public"]["Tables"]["transaction_rules"]["Insert"];
type MerchantAliasInsert =
  Database["public"]["Tables"]["merchant_aliases"]["Insert"];
type TagInsert = Database["public"]["Tables"]["transaction_tags"]["Insert"];
type SplitInsert = Database["public"]["Tables"]["transaction_splits"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

export class TransactionAutomationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listActiveRules(householdId: string): Promise<RepoResult<Rule[]>> {
    const { data, error } = await this.client
      .from("transaction_rules")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    return error ? { data: null, error } : { data: data ?? [], error: null };
  }

  async createRule(input: RuleInsert): Promise<RepoResult<Rule>> {
    const { data, error } = await this.client
      .from("transaction_rules")
      .insert(input)
      .select("*")
      .single();
    return error ? { data: null, error } : { data, error: null };
  }

  async createMerchantAlias(input: MerchantAliasInsert) {
    const { data, error } = await this.client
      .from("merchant_aliases")
      .insert(input)
      .select("*")
      .single();
    return error ? { data: null, error } : { data, error: null };
  }

  async createTag(input: TagInsert) {
    const { data, error } = await this.client
      .from("transaction_tags")
      .insert(input)
      .select("*")
      .single();
    return error ? { data: null, error } : { data, error: null };
  }

  async bulkUpdateTransactions(
    householdId: string,
    transactionIds: readonly string[],
    changes: TransactionUpdate,
  ): Promise<RepoResult<number>> {
    if (transactionIds.length === 0) return { data: 0, error: null };
    const { data, error } = await this.client
      .from("transactions")
      .update(changes)
      .eq("household_id", householdId)
      .in("id", [...new Set(transactionIds)])
      .select("id");
    return error
      ? { data: null, error }
      : { data: data?.length ?? 0, error: null };
  }

  async replaceTags(
    householdId: string,
    transactionIds: readonly string[],
    tagIds: readonly string[],
  ): Promise<RepoResult<number>> {
    const uniqueTransactions = [...new Set(transactionIds)];
    const uniqueTags = [...new Set(tagIds)];
    if (uniqueTransactions.length === 0) return { data: 0, error: null };

    const { error: deleteError } = await this.client
      .from("transaction_tag_assignments")
      .delete()
      .eq("household_id", householdId)
      .in("transaction_id", uniqueTransactions);
    if (deleteError) return { data: null, error: deleteError };
    if (uniqueTags.length === 0) return { data: 0, error: null };

    const rows = uniqueTransactions.flatMap((transactionId) =>
      uniqueTags.map((tagId) => ({
        household_id: householdId,
        transaction_id: transactionId,
        tag_id: tagId,
      })),
    );
    const { error } = await this.client
      .from("transaction_tag_assignments")
      .insert(rows);
    return error ? { data: null, error } : { data: rows.length, error: null };
  }

  async replaceSplits(
    householdId: string,
    transactionId: string,
    splits: readonly Omit<SplitInsert, "household_id" | "transaction_id">[],
  ): Promise<RepoResult<number>> {
    const { error: deleteError } = await this.client
      .from("transaction_splits")
      .delete()
      .eq("household_id", householdId)
      .eq("transaction_id", transactionId);
    if (deleteError) return { data: null, error: deleteError };

    const rows = splits.map((split, sortOrder) => ({
      ...split,
      household_id: householdId,
      transaction_id: transactionId,
      sort_order: sortOrder,
    }));
    const { error } = await this.client.from("transaction_splits").insert(rows);
    return error ? { data: null, error } : { data: rows.length, error: null };
  }
}

export const transactionAutomationRepository =
  new TransactionAutomationRepository(supabase);
