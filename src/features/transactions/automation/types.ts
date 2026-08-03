import type { Database } from "@/types/database.types";

export type TransactionType = Database["public"]["Enums"]["transaction_type"];
export type TransactionRule =
  Database["public"]["Tables"]["transaction_rules"]["Row"];
export type TransactionSplitInput = Pick<
  Database["public"]["Tables"]["transaction_splits"]["Insert"],
  "category_id" | "amount" | "notes"
>;

export interface TransactionRuleCandidate {
  title: string;
  accountId: string;
  type: TransactionType;
}

export interface TransactionRuleResult {
  ruleId: string;
  categoryId: string | null;
  merchantName: string | null;
}

export interface BulkTransactionChanges {
  categoryId?: string | null;
  merchantName?: string | null;
  tagIds?: string[];
}
