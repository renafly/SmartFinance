import type { Database } from "@/types/database.types";

export type ReplenishmentRunStatus =
  Database["public"]["Enums"]["replenishment_run_status"];
export type ReplenishmentSourceKind =
  Database["public"]["Enums"]["replenishment_source_kind"];

export type ReplenishmentRun =
  Database["public"]["Tables"]["replenishment_runs"]["Row"];
export type ReplenishmentRunTransactionRow =
  Database["public"]["Tables"]["replenishment_run_transactions"]["Row"];
export type ReplenishmentRunSourceRow =
  Database["public"]["Tables"]["replenishment_run_sources"]["Row"];

/** A transaction row (from list_transaction_movements) selected in step 1 as
 * needing replenishment. Only non-transfer expense/income movements are
 * eligible -- a transfer already has two real legs and nothing to "repay". */
export type ReplenishableTransaction = {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  categoryId: string | null;
  title: string;
  transactionDate: string;
};

/** A money source chosen in step 3, before/after resolving a pot to its
 * concrete backing account. `potId` is set only when `kind === "pot"`. */
export type ReplenishmentSourceDraft = {
  kind: ReplenishmentSourceKind;
  potId: string | null;
  /** The real account money will actually leave. For an account source this
   * is the account itself; for a pot source, the backing account the user
   * picked (or the pot's only account, when it has just one). */
  resolvedAccountId: string;
  label: string;
  /** Current balance of resolvedAccountId, used for the suggested split and
   * the soft over-balance warning. */
  availableAmount: number;
  suggestedAmount: number;
  amount: number;
};

export type ReplenishmentDestination = {
  accountId: string;
  accountName: string;
  amount: number;
};

export type ReplenishmentTransferPreview = {
  sourceAccountId: string;
  sourceLabel: string;
  destinationAccountId: string;
  destinationLabel: string;
  amount: number;
};

export type ReplenishmentPreview = {
  transactionIds: string[];
  destinations: ReplenishmentDestination[];
  sources: { resolvedAccountId: string; amount: number; suggestedAmount: number }[];
  transfers: ReplenishmentTransferPreview[];
  totalAmount: number;
};

export type ReplenishmentRunDetail = ReplenishmentRun & {
  transactions: (ReplenishmentRunTransactionRow & {
    account: { id: string; name: string } | null;
    category: { id: string; name: string; icon: string | null } | null;
  })[];
  sources: (ReplenishmentRunSourceRow & {
    account: { id: string; name: string } | null;
    pot: { id: string; name: string } | null;
  })[];
  transfers: {
    transferGroupId: string;
    sourceAccountId: string;
    sourceAccountName: string;
    destinationAccountId: string;
    destinationAccountName: string;
    amount: number;
  }[];
};
