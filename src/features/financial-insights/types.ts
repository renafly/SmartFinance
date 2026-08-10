import type { Database } from "@/types/database.types";

export type TransactionKind = Database["public"]["Enums"]["transaction_type"];

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
