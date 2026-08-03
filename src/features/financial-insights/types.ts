import type { Database } from "@/types/database.types";

export type TransactionKind = Database["public"]["Enums"]["transaction_type"];
export type RecurringFrequency = Database["public"]["Enums"]["recurring_frequency"];
export type RecurringRuleKind = Database["public"]["Enums"]["recurring_rule_kind"];

export type InsightTransaction = {
  id: string;
  title: string;
  amount: number;
  type: TransactionKind;
  transaction_date: string;
  account_id: string;
  category_id?: string | null;
  transfer_group_id?: string | null;
};

export type InsightRecurringRule = {
  id: string;
  title: string;
  amount: number;
  type: TransactionKind;
  frequency: RecurringFrequency;
  rule_kind: RecurringRuleKind;
  account_id: string;
  category_id?: string | null;
  destination_account_id?: string | null;
  next_run: string;
  excluded_months?: number[] | null;
  is_active: boolean;
};

export type AccountBalanceInput = {
  id: string;
  name?: string | null;
  current_balance: number | null;
};
