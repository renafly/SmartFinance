// features/transactions/utils/reimbursements.ts
//
// Pure, framework-agnostic helpers for expense reimbursements (a third
// party paying back part -- or more than -- the cost of one expense). See
// docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §2 and
// supabase/migrations/20260901000400_transaction_reimbursements.sql.
//
// Money is stored server-side as numeric(14,2); the float risk here is
// purely client-side (JS numbers), so the sum is done in integer cents and
// only converted back to a euro number at the boundary -- same technique
// as utils/transaction-allocations.ts.

export type ReimbursementDraft = {
  /** Client-local id for React keys / row removal. Not necessarily a DB id. */
  id: string;
  payerName: string;
  /** Euro amount, exact to the cent. Must be > 0 -- a 0 reimbursement is not a real one. */
  amount: number;
  note?: string | null;
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
  | "non_positive_amount";

/**
 * Validates one draft row before it's saved. A 0 (or negative) amount is
 * rejected here -- the same rule the `amount > 0` DB check enforces --
 * specifically so a "reimbursement" with nothing in it never gets past the
 * form and becomes a phantom entry.
 */
export function validateReimbursementDraft(
  draft: Pick<ReimbursementDraft, "payerName" | "amount">,
): ReimbursementValidationError[] {
  const errors: ReimbursementValidationError[] = [];
  if (!draft.payerName.trim()) errors.push("missing_payer_name");
  if (!(draft.amount > 0)) errors.push("non_positive_amount");
  return errors;
}
