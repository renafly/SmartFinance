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
  /** Whether the underlying transaction is split (funded/allocated across
   * more than one account/pot via transaction_allocations). Determines
   * which of confirm_replenishment_run's reassignment branches this unit
   * goes through -- see ReplenishmentWizard's buildUnitSources -- and is
   * therefore also what decides whether a pot-sourced replenishment needs
   * its backing account_id included alongside pot_id. */
  isSplit: boolean;
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

/** Read-only, display-only summary of "money effectively moved from this
 * account to that one" -- derived client-side by aggregating the per-unit
 * source assignments below by (sourceAccountId, destinationAccountId).
 * Never sent to confirm_replenishment_run: it reassigns each covered unit's
 * real origin directly, so there is no separate transfer to create or
 * preview against a stored shape -- this exists purely so the Preview step
 * can still show "what will effectively happen" the same way it always
 * has. */
export type ReplenishmentTransferPreview = {
  sourceAccountId: string;
  sourceLabel: string;
  destinationAccountId: string;
  destinationLabel: string;
  amount: number;
};

/** One funding source assigned to (part of) a covered unit, in the exact
 * shape confirm_replenishment_run's p_unit_sources expects. `accountId` is
 * always populated for an `"account"` source; for a `"pot"` source it is
 * only populated when this is the unit's single, sole source AND the unit
 * is a whole non-split transaction -- the RPC there needs the pot's real
 * backing account_id written onto transactions.account_id itself, exactly
 * like a normal non-split "paid from a pot" expense already stores it
 * elsewhere in the app. In every other case (more than one source funding
 * the unit, or the unit is one allocation row of an already-split
 * transaction) a pot source is sent with `accountId: null` -- the
 * discriminated shape transaction_allocations itself requires. See
 * ReplenishmentWizard's buildUnitSources for exactly which case applies. */
export type ReplenishmentSourceAssignment = {
  sourceType: ReplenishmentSourceKind;
  accountId: string | null;
  potId: string | null;
  amount: number;
};

/** One covered unit (a whole transaction, or one allocation row of an
 * already-split transaction) and the real funding source(s) it should be
 * reassigned to -- confirm_replenishment_run's p_unit_sources element
 * shape. `accountId` here is the unit's OLD account_id (identifying which
 * replenishment_run_transactions row this is), not a source. */
export type ReplenishmentUnitSourceAssignment = {
  transactionId: string;
  accountId: string;
  sources: ReplenishmentSourceAssignment[];
};

export type ReplenishmentPreview = {
  transactionIds: string[];
  destinations: ReplenishmentDestination[];
  sources: { resolvedAccountId: string; amount: number; suggestedAmount: number }[];
  unitSources: ReplenishmentUnitSourceAssignment[];
  totalAmount: number;
};

export type ReplenishmentRunDetail = ReplenishmentRun & {
  transactions: (ReplenishmentRunTransactionRow & {
    account: { id: string; name: string } | null;
    category: { id: string; name: string; icon: string | null } | null;
    /** The original transaction this run's snapshot row was created from --
     * still joined live via transaction_id (which is on delete restrict, so
     * this is always present) so the detail view can show which expense a
     * covered-transactions row actually helps. */
    transaction: { id: string; title: string } | null;
    /** Populated by confirm_replenishment_run (direct-source-reassignment
     * model, from 20260901002700 onward): the real funding source(s) this
     * covered unit was reassigned to. Null while the run is still draft,
     * and permanently null on a run confirmed before that migration --
     * those created paired transfer transactions instead (see `transfers`
     * below) and have nothing to record here. */
    new_sources: { source_type: string; account_id: string | null; pot_id: string | null; amount: number }[] | null;
  })[];
  sources: (ReplenishmentRunSourceRow & {
    account: { id: string; name: string } | null;
    pot: { id: string; name: string } | null;
  })[];
  /** Paired transfer-leg transactions from a run confirmed under the old
   * (pre-20260901002700) model, which created a real expense/income
   * transfer per settled account pair instead of reassigning the covered
   * transaction's own origin. Always empty for a run confirmed after that
   * migration -- see each transaction's own `new_sources` instead. */
  transfers: {
    transferGroupId: string;
    sourceAccountId: string;
    sourceAccountName: string;
    destinationAccountId: string;
    destinationAccountName: string;
    amount: number;
  }[];
};
