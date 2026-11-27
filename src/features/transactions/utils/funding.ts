// Splitting the effective cost of a reimbursed expense.
//
// The user splits what an expense really cost (amount minus what others
// paid back) across accounts; every reimbursement is received in one of
// those accounts. transaction_allocations still stores FULL amounts that
// sum to the transaction amount:
//
//   full[account] = effective[account] + reimbursements received in it
//
// These helpers convert between the two views and validate a funding the
// same way save_transaction_funding does server-side, so the user is never
// shown a "Save" that the server would reject.

import {
  fromCents,
  toCents,
  validateAllocations,
  type AllocationDraft,
  type AllocationValidationError,
} from "./transaction-allocations";

export type ReimbursementTarget = { accountId: string | null; amount: number };

export type FundingError =
  | AllocationValidationError
  | "receiving_outside_split"
  | "receiving_not_paid_from"
  | "reimbursed_exceeds_amount";

function receivedCentsByAccount(reimbursements: readonly ReimbursementTarget[]): Map<string, number> {
  const received = new Map<string, number>();
  for (const reimbursement of reimbursements) {
    if (!reimbursement.accountId) continue;
    received.set(reimbursement.accountId, (received.get(reimbursement.accountId) ?? 0) + toCents(reimbursement.amount));
  }
  return received;
}

function reimbursedCents(reimbursements: readonly ReimbursementTarget[]): number {
  return reimbursements.reduce((sum, reimbursement) => sum + toCents(reimbursement.amount), 0);
}

/** What the expense really cost: amount minus everything reimbursed. */
export function effectiveTotal(amount: number, reimbursements: readonly ReimbursementTarget[]): number {
  return fromCents(toCents(amount) - reimbursedCents(reimbursements));
}

/** Allocation keys (`account:<id>`) of the accounts that received money --
 * the only split rows allowed to be 0. */
export function receivingAccountKeys(reimbursements: readonly ReimbursementTarget[]): Set<string> {
  return new Set([...receivedCentsByAccount(reimbursements).keys()].map((accountId) => `account:${accountId}`));
}

export function toFullAllocations(
  effective: readonly AllocationDraft[],
  reimbursements: readonly ReimbursementTarget[],
): AllocationDraft[] {
  const received = receivedCentsByAccount(reimbursements);
  return effective.map((allocation) => {
    const extra = allocation.sourceType === "account" && allocation.accountId ? (received.get(allocation.accountId) ?? 0) : 0;
    return extra === 0 ? allocation : { ...allocation, amount: fromCents(toCents(allocation.amount) + extra) };
  });
}

/** The saved split as the user edits it, or null when an account received
 * more than its saved share (data the effective view cannot represent). */
export function toEffectiveAllocations(
  full: readonly AllocationDraft[],
  reimbursements: readonly ReimbursementTarget[],
): AllocationDraft[] | null {
  const received = receivedCentsByAccount(reimbursements);
  const result: AllocationDraft[] = [];
  for (const allocation of full) {
    const extra = allocation.sourceType === "account" && allocation.accountId ? (received.get(allocation.accountId) ?? 0) : 0;
    const cents = toCents(allocation.amount) - extra;
    if (cents < 0) return null;
    result.push(extra === 0 ? allocation : { ...allocation, amount: fromCents(cents) });
  }
  return result;
}

export function validateFunding(input: {
  amount: number;
  splitEnabled: boolean;
  effective: readonly AllocationDraft[];
  reimbursements: readonly ReimbursementTarget[];
  paidFromAccountId: string | null;
}): FundingError[] {
  const errors: FundingError[] = [];

  if (!input.splitEnabled) {
    if (input.reimbursements.some((reimbursement) => reimbursement.accountId !== input.paidFromAccountId)) {
      errors.push("receiving_not_paid_from");
    }
    return errors;
  }

  if (reimbursedCents(input.reimbursements) >= toCents(input.amount)) {
    errors.push("reimbursed_exceeds_amount");
  }

  const splitAccounts = new Set(
    input.effective.flatMap((allocation) => (allocation.sourceType === "account" && allocation.accountId ? [allocation.accountId] : [])),
  );
  if (input.reimbursements.some((reimbursement) => !reimbursement.accountId || !splitAccounts.has(reimbursement.accountId))) {
    errors.push("receiving_outside_split");
  }

  errors.push(
    ...validateAllocations(effectiveTotal(input.amount, input.reimbursements), input.effective, {
      zeroAllowedTargetKeys: receivingAccountKeys(input.reimbursements),
    }),
  );
  return errors;
}

/** Everything that save_transaction_funding writes, as a comparable string
 * -- lets the edit modal tell whether the user touched the funding at all,
 * so an expense whose stored funding can't be edited in the effective view
 * (a pot slice, legacy data) can still have its title/category saved. */
export function fundingFingerprint(input: {
  amount: number;
  splitEnabled: boolean;
  paidFromAccountId?: string | null;
  allocations: readonly AllocationDraft[];
  reimbursements: readonly {
    id: string | null;
    payerName: string;
    amount: number;
    accountId: string | null;
    receivedOn: string | null;
    note: string | null;
  }[];
}): string {
  const allocations = input.splitEnabled
    ? input.allocations
        .map((allocation) => `${allocation.sourceType}:${allocation.accountId ?? allocation.potId ?? ""}=${toCents(allocation.amount)}`)
        .sort()
    : [];
  const reimbursements = input.reimbursements
    .map((row) =>
      [row.id ?? "new", row.payerName.trim(), toCents(row.amount), row.accountId ?? "", row.receivedOn ?? "", row.note ?? ""].join("|"),
    )
    .sort();
  return JSON.stringify([toCents(input.amount), input.splitEnabled, input.paidFromAccountId ?? null, allocations, reimbursements]);
}
