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
  balance_after_transaction: number | null;
  account: Pick<
    Database["public"]["Tables"]["accounts"]["Row"],
    "id" | "name" | "owner_profile_id"
  > | null;
  created_by_profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "full_name"
  > | null;
  category: Pick<
    Database["public"]["Tables"]["categories"]["Row"],
    "id" | "name" | "icon"
  > | null;
};

export type CategorySuggestionHistoryRow = Pick<
  Transaction,
  | "id"
  | "title"
  | "account_id"
  | "category_id"
  | "transaction_date"
  | "created_at"
  | "type"
> & {
  category: Pick<
    Database["public"]["Tables"]["categories"]["Row"],
    "id" | "name"
  > | null;
};

export type TitleSuggestionHistoryRow = Pick<
  Transaction,
  | "id"
  | "title"
  | "account_id"
  | "category_id"
  | "transaction_date"
  | "created_at"
  | "type"
> & {
  category: Pick<
    Database["public"]["Tables"]["categories"]["Row"],
    "id" | "name"
  > | null;
};

const TRANSACTION_WITH_RELATIONS_SELECT =
  "*, balance_after_transaction, account:accounts(id, name, owner_profile_id), created_by_profile:profiles!transactions_created_by_fkey(id, full_name), category:categories(id, name, icon)";

export interface TransactionFilters {
  accountId?: string;
  /** Use null to return only uncategorized transactions. */
  categoryId?: string | null;
  createdBy?: string;
  type?: TransactionType;
  /** ISO date string, inclusive lower bound on transaction_date */
  from?: string;
  /** ISO date string, inclusive upper bound on transaction_date */
  to?: string;
  /** Case-insensitive match against title, notes, or merchant_name. */
  search?: string;
  /** Inclusive lower bound on amount. */
  minAmount?: number;
  /** Inclusive upper bound on amount. */
  maxAmount?: number;
  /** Database ordering applied before limit/offset pagination. */
  sortBy?:
    | "newest"
    | "oldest"
    | "amount_desc"
    | "amount_asc"
    | "title_asc"
    | "title_desc";
  limit?: number;
  offset?: number;
}

export type TransactionMovementKind = "income" | "expense" | "transfer";
export type TransactionMovement = {
  movement_id: string;
  movement_kind: TransactionMovementKind;
  household_id: string;
  transaction_id: string | null;
  transfer_group_id: string | null;
  source_transaction_id: string | null;
  destination_transaction_id: string | null;
  account_id: string | null;
  source_account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  created_by: string;
  title: string;
  notes: string | null;
  merchant_name: string | null;
  amount: number;
  balance_after_transaction: number | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  monthly_budget_run_id: string | null;
  generated_by_rule_id: string | null;
  recurring_execution_id: string | null;
  budget_section: Database["public"]["Enums"]["monthly_budget_section"] | null;
  account: TransactionWithRelations["account"];
  source_account: TransactionWithRelations["account"];
  destination_account: TransactionWithRelations["account"];
  category: TransactionWithRelations["category"];
  created_by_profile: TransactionWithRelations["created_by_profile"];
};

export interface TransactionMovementFilters extends Omit<TransactionFilters, "type"> {
  kind?: TransactionMovementKind;
  sourceAccountId?: string;
  destinationAccountId?: string;
  /**
   * Drops transfer rows server-side. Distinct from `kind: "transfer"`
   * (which is an inclusion filter) -- this is used by the "movements" view
   * (income + expense, transfers hidden) so every returned page is fully
   * populated instead of being trimmed after the fact on the client.
   */
  excludeTransfers?: boolean;
}

export type TransactionMovementSummary = {
  movement_count: number;
  income_total: number;
  expense_total: number;
  net_total: number;
};

export interface UpdateCompletedTransferInput {
  transferGroupId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  title: string;
  notes?: string | null;
  transactionDate: string;
  categoryId?: string | null;
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

export interface BulkUpdateTransactionCategoryInput {
  householdId: string;
  transactionIds: string[];
  categoryId: string | null;
}

export interface BulkUpdateTransferCategoryInput {
  householdId: string;
  transferGroupIds: string[];
  categoryId: string | null;
}

export class TransactionsRepository extends BaseRepository<"transactions"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "transactions");
  }

  async bulkUpdateCategory(
    input: BulkUpdateTransactionCategoryInput,
  ): Promise<RepoResult<number>> {
    const { data, error } = await this.client.rpc(
      "bulk_update_transaction_category",
      {
        p_household_id: input.householdId,
        p_transaction_ids: input.transactionIds,
        p_category_id: input.categoryId,
      },
    );
    if (error) return { data: null, error };
    return { data: data as number, error: null };
  }

  /** Applies one category to every leg of each selected transfer group.
   * Mirrors bulkUpdateCategory's shape, but the RPC updates two rows per
   * requested id (the source and destination legs) and returns the count of
   * transfer groups updated, not raw rows -- so the result stays comparable
   * to how many transfers the caller actually selected. */
  async bulkUpdateTransferCategory(
    input: BulkUpdateTransferCategoryInput,
  ): Promise<RepoResult<number>> {
    const { data, error } = await this.client.rpc(
      "bulk_update_transfer_category",
      {
        p_household_id: input.householdId,
        p_transfer_group_ids: input.transferGroupIds,
        p_category_id: input.categoryId,
      },
    );
    if (error) return { data: null, error };
    return { data: data as number, error: null };
  }

  async listMovements(
    householdId: string,
    filters: TransactionMovementFilters = {},
  ): Promise<RepoResult<TransactionMovement[]>> {
    const { data, error } = await this.client.rpc("list_transaction_movements", {
      p_household_id: householdId,
      p_kind: filters.kind ?? null,
      p_account_id: filters.accountId ?? null,
      p_source_account_id: filters.sourceAccountId ?? null,
      p_destination_account_id: filters.destinationAccountId ?? null,
      p_category_id: filters.categoryId ?? null,
      p_uncategorized: filters.categoryId === null,
      p_created_by: filters.createdBy ?? null,
      p_from: filters.from ?? null,
      p_to: filters.to ?? null,
      p_sort: filters.sortBy ?? "newest",
      p_limit: filters.limit ?? 25,
      p_offset: filters.offset ?? 0,
      p_exclude_transfers: filters.excludeTransfers ?? false,
      p_search: filters.search?.trim() || null,
      p_min_amount: filters.minAmount ?? null,
      p_max_amount: filters.maxAmount ?? null,
    });
    if (error) return { data: null, error };

    return { data: (data as TransactionMovement[]) ?? [], error: null };
  }

  /**
   * Aggregates over the FULL filtered set (not just loaded pages) using the
   * same filters as listMovements, minus sort/limit/offset. Backs the
   * results-summary bar above the Transactions list.
   */
  async summarizeMovements(
    householdId: string,
    filters: TransactionMovementFilters = {},
  ): Promise<RepoResult<TransactionMovementSummary>> {
    const { data, error } = await this.client.rpc(
      "summarize_transaction_movements",
      {
        p_household_id: householdId,
        p_kind: filters.kind ?? null,
        p_account_id: filters.accountId ?? null,
        p_source_account_id: filters.sourceAccountId ?? null,
        p_destination_account_id: filters.destinationAccountId ?? null,
        p_category_id: filters.categoryId ?? null,
        p_uncategorized: filters.categoryId === null,
        p_created_by: filters.createdBy ?? null,
        p_from: filters.from ?? null,
        p_to: filters.to ?? null,
        p_exclude_transfers: filters.excludeTransfers ?? false,
        p_search: filters.search?.trim() || null,
        p_min_amount: filters.minAmount ?? null,
        p_max_amount: filters.maxAmount ?? null,
      },
    );
    if (error) return { data: null, error };

    const row = (data as TransactionMovementSummary[] | null)?.[0] ?? {
      movement_count: 0,
      income_total: 0,
      expense_total: 0,
      net_total: 0,
    };
    return { data: row, error: null };
  }

  async updateCompletedTransfer(input: UpdateCompletedTransferInput): Promise<RepoResult<string>> {
    const { data, error } = await this.client.rpc("update_completed_transfer", {
      p_transfer_group_id: input.transferGroupId,
      p_source_account_id: input.sourceAccountId,
      p_destination_account_id: input.destinationAccountId,
      p_amount: input.amount,
      p_title: input.title,
      p_notes: input.notes ?? null,
      p_transaction_date: input.transactionDate,
      p_category_id: input.categoryId ?? null,
    });
    if (error) return { data: null, error };
    return { data: data as string, error: null };
  }

  async deleteCompletedTransfer(transferGroupId: string): Promise<RepoResult<number>> {
    const { data, error } = await this.client.rpc("delete_completed_transfer", {
      p_transfer_group_id: transferGroupId,
    });
    if (error) return { data: null, error };
    return { data: data as number, error: null };
  }

  /**
   * A category filter should also surface transactions filed under that
   * category's subcategories (picking "Groceries" shouldn't hide "Groceries
   * > Snacks"). Filtering by a subcategory itself stays an exact match,
   * which falls out naturally here: a subcategory has no children of its
   * own, so this just returns `[categoryId]` unchanged. Derived from
   * categories.parent_id at request time rather than any hardcoded
   * parent/child table.
   */
  private async resolveCategoryFilterIds(
    householdId: string,
    categoryId: string,
  ): Promise<string[]> {
    const { data } = await this.client
      .from("categories")
      .select("id")
      .eq("household_id", householdId)
      .eq("parent_id", categoryId);

    const childIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
    return childIds.length ? [categoryId, ...childIds] : [categoryId];
  }

  async listForHousehold(
    householdId: string,
    filters: TransactionFilters = {},
  ): Promise<RepoResult<TransactionWithRelations[]>> {
    let query = this.client
      .from("transactions")
      .select(TRANSACTION_WITH_RELATIONS_SELECT)
      .eq("household_id", householdId);

    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.categoryId === null) {
      query = query.is("category_id", null);
    } else if (filters.categoryId) {
      const categoryIds = await this.resolveCategoryFilterIds(
        householdId,
        filters.categoryId,
      );
      query =
        categoryIds.length > 1
          ? query.in("category_id", categoryIds)
          : query.eq("category_id", filters.categoryId);
    }
    if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.from) query = query.gte("transaction_date", filters.from);
    if (filters.to) query = query.lte("transaction_date", filters.to);

    switch (filters.sortBy) {
      case "oldest":
        query = query
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
      case "amount_desc":
        query = query
          .order("amount", { ascending: false })
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
      case "amount_asc":
        query = query
          .order("amount", { ascending: true })
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
      case "title_asc":
        query = query
          .order("title", { ascending: true })
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
      case "title_desc":
        query = query
          .order("title", { ascending: false })
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
      case "newest":
      default:
        query = query
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        break;
    }

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

  /**
   * A bounded, RLS-protected history used to learn category suggestions.
   * Transfers and uncategorized rows cannot contribute to suggestions.
   */
  async listCategorySuggestionHistory(
    householdId: string,
    type: TransactionType,
    limit = 300,
  ): Promise<RepoResult<CategorySuggestionHistoryRow[]>> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const { data, error } = await this.client
      .from("transactions")
      .select(
        "id, title, account_id, category_id, transaction_date, created_at, type, category:categories(id, name)",
      )
      .eq("household_id", householdId)
      .eq("type", type)
      .not("category_id", "is", null)
      .is("transfer_group_id", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { data: null, error };
    return {
      data: (data as unknown as CategorySuggestionHistoryRow[]) ?? [],
      error: null,
    };
  }

  /** Bounded household history used for transaction-name autocomplete. */
  async listTitleSuggestionHistory(
    householdId: string,
    type: TransactionType,
    limit = 500,
  ): Promise<RepoResult<TitleSuggestionHistoryRow[]>> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const { data, error } = await this.client
      .from("transactions")
      .select(
        "id, title, account_id, category_id, transaction_date, created_at, type, category:categories(id, name)",
      )
      .eq("household_id", householdId)
      .eq("type", type)
      .is("transfer_group_id", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { data: null, error };
    return {
      data: (data as unknown as TitleSuggestionHistoryRow[]) ?? [],
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
