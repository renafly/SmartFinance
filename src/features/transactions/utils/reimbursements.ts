// features/transactions/utils/reimbursements.ts
//
// Pure, framework-agnostic helpers for expense reimbursements (a third
// party paying back part -- or more than -- the cost of one expense). See
// docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2 and
// supabase/migrations/20260901000400_transaction_reimbursements.sql plus
// 20260901002500_reimbursement_allocations.sql (adds source_type/account_id/
// pot_id so a reimbursement records which of the household's own accounts
// or pots the money landed in, using the exact same
// source-selection/allocation shape and math as
// utils/transaction-allocations.ts's split-funding AllocationDraft --
// deliberately reused rather than reimplemented, see
// components/split-allocations-editor.tsx and reimbursement-section.tsx).
//
// Money is stored server-side as numeric(14,2); the float risk here is
// purely client-side (JS numbers), so the sum is done in integer cents and
// only converted back to a euro number at the boundary -- same technique
// as utils/transaction-allocations.ts.

import {
  createAllocationDraftId,
  validateAllocations,
  type AllocationSourceType,
  type AllocationValidationError,
} from "@/features/transactions/utils/transaction-allocations";

export type ReimbursementDraft = {
  /** Client-local id for React keys / row removal. Not necessarily a DB id. */
  id: string;
  payerName: string;
  /** Euro amount, exact to the cent. Must be > 0 -- a 0 reimbursement is not a real one. */
  amount: number;
  note?: string | null;
  /**
   * Which of the household's own accounts/pots this reimbursement's money
   * landed in -- same AllocationSourceType/accountId/potId shape a split
   * allocation row uses, so this type is structurally an AllocationDraft
   * (see transaction-allocations.ts) plus payerName/note, and every
   * allocation helper (validateAllocations, summarizeAllocations,
   * distributeEqualSplitAmounts, allocationsToPercentages,
   * createAllocationDraftId, ...) works on ReimbursementDraft[] unchanged.
   */
  sourceType: AllocationSourceType;
  accountId: string | null;
  potId: string | null;
};

export type EffectiveAmountBreakdown = {
  originalAmount: number;
  reimbursedTotal: number;
  /** originalAmount - reimbursedTotal. Negative when over-reimbursed. */
  effectiveAmount: number;
  /** true when a mix of "some money still spent" isn't the case -- every cent (or more) came back. */
  isFullyReimbursed: boolean;
  /** true when reimbursedTotal > originalAmount -- the payer covered more than the expense cost. */
  isOverReimbursed: boolean;
};

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Sums a set of reimbursement amounts and nets them against the original
 * expense amount. Handles partial, total, and over-reimbursement (the
 * result goes negative) identically -- there is no special case, just
 * subtraction. Reimbursement rows with a non-positive amount are ignored
 * defensively (the DB rejects them outright via `amount > 0`, so this only
 * matters for not-yet-saved draft rows in a form).
 */
export function computeEffectiveAmount(
  originalAmount: number,
  reimbursements: readonly Pick<ReimbursementDraft, "amount">[],
): EffectiveAmountBreakdown {
  const originalCents = toCents(originalAmount);
  const reimbursedCents = reimbursements.reduce(
    (sum, r) => sum + (r.amount > 0 ? toCents(r.amount) : 0),
    0,
  );
  const effectiveCents = originalCents - reimbursedCents;

  return {
    originalAmount: fromCents(originalCents),
    reimbursedTotal: fromCents(reimbursedCents),
    effectiveAmount: fromCents(effectiveCents),
    isFullyReimbursed: effectiveCents <= 0 && reimbursedCents > 0,
    isOverReimbursed: reimbursedCents > originalCents,
  };
}

export type ReimbursementValidationError =
  | "missing_payer_name"
  | "non_positive_amount"
  | "missing_source";

/**
 * Validates one draft row before it's saved. A 0 (or negative) amount is
 * rejected here -- the same rule the `amount > 0` DB check enforces --
 * specifically so a "reimbursement" with nothing in it never gets past the
 * form and becomes a phantom entry. `sourceType`/`accountId`/`potId` are
 * optional here so this same function still validates the legacy
 * payer-name-only shape wherever a caller doesn't collect a source (kept
 * mainly for the edit-transaction "live" add-row form).
 */
export function validateReimbursementDraft(
  draft: Pick<ReimbursementDraft, "payerName" | "amount"> &
    Partial<Pick<ReimbursementDraft, "sourceType" | "accountId" | "potId">>,
): ReimbursementValidationError[] {
  const errors: ReimbursementValidationError[] = [];
  if (!draft.payerName.trim()) errors.push("missing_payer_name");
  if (!(draft.amount > 0)) errors.push("non_positive_amount");
  if (draft.sourceType !== undefined) {
    const hasTarget =
      draft.sourceType === "account" ? Boolean(draft.accountId) : Boolean(draft.potId);
    if (!hasTarget) errors.push("missing_source");
  }
  return errors;
}

export type ReimbursementSetValidationError = AllocationValidationError | "missing_payer_name";

/**
 * Validates a whole set of reimbursement source rows against the
 * reimbursement's own expected total (a separate, user-entered amount --
 * NOT necessarily the expense's own amount, since a reimbursement can be
 * partial or exceed the expense; see computeEffectiveAmount above). Reuses
 * transaction-allocations.ts's validateAllocations verbatim for every
 * source-selection/sum concern (missing_target, non_positive_amount,
 * duplicate_source, sum_mismatch, too_few_allocations) with
 * `minAllocations: 1` -- unlike a funding split, a reimbursement with a
 * single source is completely normal -- then adds the one concern that's
 * specific to reimbursements: every row also needs a payer name.
 */
export function validateReimbursementAllocations(
  expectedTotal: number,
  rows: readonly ReimbursementDraft[],
): ReimbursementSetValidationError[] {
  const errors: ReimbursementSetValidationError[] = [
    ...validateAllocations(expectedTotal, rows, { minAllocations: 1 }),
  ];
  if (rows.some((row) => !row.payerName.trim())) {
    errors.push("missing_payer_name");
  }
  return errors;
}

/**
 * Creates an empty reimbursement source row -- the reimbursement
 * equivalent of transaction-allocations.ts's createEmptyAllocationDraft,
 * reusing the same client-local id generator so a row's id can never
 * collide with a split allocation's, even though both editors can be open
 * (Reimbursement in the wizard's first step, Split Source in its second)
 * at the same time.
 */
export function createEmptyReimbursementDraft(sourceType: AllocationSourceType = "account"): ReimbursementDraft {
  return {
    id: createAllocationDraftId(),
    payerName: "",
    amount: 0,
    note: null,
    sourceType,
    accountId: null,
    potId: null,
  };
}
