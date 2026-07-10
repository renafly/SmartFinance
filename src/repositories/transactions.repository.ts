import {
  BaseRepository,
  type RepoResult,
} from "@/repositories/base.repository";
import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type TransactionType = Database["public"]["Enums"]["transaction_type"];
type MonthlySummary = Database["public"]["Views"]["monthly_summary"]["Row"];
type MonthlyCategorySpending =
  Database["public"]["Views"]["monthly_category_spending"]["Row"];

// Transaction row plus the joined account, creator profile, and category
export type TransactionWithRelations = Transaction & {
  account: Pick<
    Database["public"]["Tables"]["accounts"]["Row"],
    "id" | "name"
  > | null;
  created_by_profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name"
  > | null;
  category: Pick<
    Database["public"]["Tables"]["categories"]["Row"],
    "id" | "name"
  > | null;
};

const TRANSACTION_WITH_RELATIONS_SELECT =
  "*, account:accounts(id, name), created_by_profile:profiles!transactions_created_by_fkey(id, full_name), category:categories(id, name)";

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  createdBy?: string;
  type?: TransactionType;
  /** ISO date string, inclusive lower bound on transaction_date */
  from?: string;
  /** ISO date string, inclusive upper bound on transaction_date */
  to?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTransferInput {
  householdId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  title: string;
  categoryId?: string | null;
  notes?: string;
  transactionDate?: string;
  createdBy: string;
  monthlyBudgetRunId?: string | null;
  generatedByRuleId?: string | null;
  budgetSection?: Database["public"]["Enums"]["monthly_budget_section"] | null;
}

export class TransactionsRepository extends BaseRepository<"transactions"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "transactions");
  }

  async listForHousehold(
    householdId: string,
    filters: TransactionFilters = {},
  ): Promise<RepoResult<TransactionWithRelations[]>> {
    let query = this.client
      .from("transactions")
      .select(TRANSACTION_WITH_RELATIONS_SELECT)
      .eq("household_id", householdId)
      .order("transaction_date", { ascending: false })
      .order("id", { ascending: false });

    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.from) query = query.gte("transaction_date", filters.from);
    if (filters.to) query = query.lte("transaction_date", filters.to);

    if (typeof filters.limit === "number") {
      const from = filters.offset ?? 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return {
      data: (data as unknown as TransactionWithRelations[]) ?? [],
      error: null,
    };
  }

  /** Single transaction with account, creator profile, and category joined in. */
  async findByIdWithRelations(
    id: string,
  ): Promise<RepoResult<TransactionWithRelations>> {
    const { data, error } = await this.client
      .from("transactions")
      .select(TRANSACTION_WITH_RELATIONS_SELECT)
      .eq("id", id)
      .single();

    if (error) return { data: null, error };
    return { data: data as unknown as TransactionWithRelations, error: null };
  }

  /**
   * Creates a paired transfer (expense from one account, income to another)
   * via the create_transfer RPC. Returns the transfer_group_id linking the
   * two generated transaction rows.
   */
  async createTransfer(
    input: CreateTransferInput,
  ): Promise<RepoResult<string>> {
    const { data, error } = await this.client.rpc("create_transfer", {
      p_household_id: input.householdId,
      p_from_account_id: input.fromAccountId,
      p_to_account_id: input.toAccountId,
      p_amount: input.amount,
      p_title: input.title,
      p_notes: input.notes ?? "",
      p_transaction_date: input.transactionDate ?? new Date().toISOString(),
      p_created_by: input.createdBy,
      p_category_id: input.categoryId ?? null,
      p_monthly_budget_run_id: input.monthlyBudgetRunId ?? null,
      p_generated_by_rule_id: input.generatedByRuleId ?? null,
      p_budget_section: input.budgetSection ?? null,
    });

    if (error) return { data: null, error };
    return { data: data as string, error: null };
  }

  /** All rows sharing a transfer_group_id (the two legs of a transfer). */
  async listByTransferGroup(
    transferGroupId: string,
  ): Promise<RepoResult<Transaction[]>> {
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("transfer_group_id", transferGroupId);

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async listMonthlySummary(
    householdId: string,
  ): Promise<RepoResult<MonthlySummary[]>> {
    const { data, error } = await this.client
      .from("monthly_summary")
      .select("*")
      .eq("household_id", householdId)
      .order("month", { ascending: false });

    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }

  async listMonthlyCategorySpending(
    householdId: string,
    month?: string,
  ): Promise<RepoResult<MonthlyCategorySpending[]>> {
    let query = this.client
      .from("monthly_category_spending")
      .select("*")
      .eq("household_id", householdId)
      .order("month", { ascending: false });

    if (month) query = query.eq("month", month);

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data ?? [], error: null };
  }
}

export const transactionsRepository = new TransactionsRepository(supabase);
