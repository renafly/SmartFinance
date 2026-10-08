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
  /** Set on the income row a reimbursement generated (see
   * sync_reimbursement_income_transaction) -- Wage Flow folds reimbursements
   * into the expense they repaid instead of counting them as income. */
  reimbursement_id?: string | null;
};
