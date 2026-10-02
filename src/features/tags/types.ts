/**
 * Custom expense tags ("Travel to Bali", "Baby", "Christmas 2026") --
 * a cross-category/cross-account grouping for expenses. Backed by the
 * existing transaction_tags / transaction_tag_assignments tables (see
 * src/repositories/transaction-tags.repository.ts).
 */

export type TransactionTag = {
  id: string;
  householdId: string;
  name: string;
  color: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** A tag plus its totals for the selected period (net of reimbursements). */
export type TagSummary = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  transactionCount: number;
  grossTotal: number;
  reimbursedTotal: number;
  netTotal: number;
  lastTransactionDate: string | null;
};

export type TagTransaction = {
  id: string;
  date: string;
  title: string;
  notes: string | null;
  amount: number;
  reimbursedTotal: number;
  netAmount: number;
  isSplit: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountId: string;
  accountName: string | null;
  createdBy: string;
  createdByName: string | null;
};

export type TagSortKey = "spending" | "count" | "name" | "recent";
export const TAG_SORT_KEYS: readonly TagSortKey[] = ["spending", "count", "name", "recent"];

/** Same period conventions as the rest of the app: a month (MonthPickerField) or a free from/to range (DateFilterField). */
export type TagPeriodMode = "all" | "month" | "custom";
export const TAG_PERIOD_MODES: readonly TagPeriodMode[] = ["all", "month", "custom"];

export type TagPeriodRange = { from: string | null; to: string | null };

/** i18n keys (under `tags.errors.*`) for tag-name validation failures. */
export type TagNameError = "required" | "tooLong" | "duplicate";

export const TAG_NAME_MAX_LENGTH = 60;
