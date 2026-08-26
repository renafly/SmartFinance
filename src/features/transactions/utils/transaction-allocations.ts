// features/transactions/utils/transaction-allocations.ts
//
// Pure, framework-agnostic helpers for split-transaction funding-source
// allocations. Deliberately not built on top of automation/splits.ts,
// which validates the unrelated "category lines" split concept
// (transaction_splits) -- see docs/split-transactions-plan.md.
//
// Money is stored everywhere in this schema as numeric(14,2) euros (exact
// decimal, no float risk at the DB layer). The float risk this module
// guards against is purely client-side (JS numbers are IEEE 754 doubles),
// so every calculation here is done in integer cents and only converted
// back to a euro number at the boundary -- the same technique the
// save_monthly_budget_configuration RPC already uses server-side for its
// equal-split remainder distribution.

export type AllocationSourceType = "account" | "pot";

export type AllocationDraft = {
  /** Client-local id for React keys / row removal. Not necessarily a DB id. */
  id: string;
  sourceType: AllocationSourceType;
  /** account_id when sourceType === "account" */
  accountId: string | null;
  /** pot_id when sourceType === "pot" */
  potId: string | null;
  /** Euro amount, exact to the cent. */
  amount: number;
};

export type AllocationValidationError =
  | "too_few_allocations"
  | "missing_target"
  | "non_positive_amount"
  | "duplicate_source"
  | "sum_mismatch";

export type AllocationSummary = {
  totalCents: number;
  allocatedCents: number;
  remainingCents: number;
  /** Exactly two-plus allocations whose amounts sum to the total. */
  isComplete: boolean;
  isOverAllocated: boolean;
};

/** Converts a euro amount (possibly imprecise JS float) to integer cents. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Converts integer cents back to a euro number, exact to the cent. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Splits `totalCents` evenly across `count` rows, distributing the leftover
 * cent-by-cent to the first rows so the result always sums to exactly
 * `totalCents`. Same algorithm as save_monthly_budget_configuration's
 * equal_split allocation mode, so a client-side preview always agrees with
 * what the server would compute.
 */
export function distributeEqualSplitCents(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.trunc(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Euro-amount convenience wrapper around distributeEqualSplitCents. */
export function distributeEqualSplitAmounts(totalAmount: number, count: number): number[] {
  return distributeEqualSplitCents(toCents(totalAmount), count).map(fromCents);
}

/**
 * Largest-remainder rounding shared by amountsToPercentages and
 * percentagesToAmountsCents: distributes `target - sum(floors)` +1/-1 units
 * to the entries with the largest/smallest fractional remainder so the
 * result always sums to exactly `target`, however the raw (unrounded)
 * values were skewed by floating-point division.
 */
function distributeRemainder(rawValues: number[], target: number): number[] {
  const floors = rawValues.map((value) => Math.floor(value));
  const flooredSum = floors.reduce((sum, value) => sum + value, 0);
  const remainder = target - flooredSum;
  const result = [...floors];
  if (remainder === 0 || rawValues.length === 0) return result;

  const fracs = rawValues.map((value, index) => ({ index, frac: value - Math.floor(value) }));

  if (remainder > 0) {
    // Give the extra units to the entries closest to rounding up already.
    fracs.sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) {
      result[fracs[k % fracs.length].index] += 1;
    }
  } else {
    // Over-allocated raw values (e.g. percentages typed mid-edit summing
    // above 100%): take back units from the entries least deserving of
    // their rounded-up cent, so the total still lands exactly on target.
    fracs.sort((a, b) => a.frac - b.frac);
    for (let k = 0; k < -remainder; k++) {
      result[fracs[k % fracs.length].index] -= 1;
    }
  }

  return result;
}

/**
 * Converts euro-cent amounts to percentages (2 decimal places, i.e. basis
 * points / 100) that always sum to exactly 100.00, using the largest
 * remainder method. Returns all-zero when totalCents <= 0 (nothing to
 * divide by) so callers never see NaN/Infinity.
 */
export function amountsToPercentages(amountsCents: number[], totalCents: number): number[] {
  if (totalCents <= 0 || amountsCents.length === 0) {
    return amountsCents.map(() => 0);
  }
  const BASIS_POINTS_TOTAL = 10000; // 100.00%
  const rawBasisPoints = amountsCents.map((cents) => (cents * BASIS_POINTS_TOTAL) / totalCents);
  const basisPoints = distributeRemainder(rawBasisPoints, BASIS_POINTS_TOTAL);
  return basisPoints.map((bp) => bp / 100);
}

/**
 * Converts percentages back to euro-cent amounts that always sum to exactly
 * `totalCents`, using the largest remainder method. Percentages do not need
 * to sum to exactly 100 going in (the UI may call this while the user is
 * still editing) -- the result is always forced to sum to totalCents.
 */
export function percentagesToAmountsCents(percentages: number[], totalCents: number): number[] {
  if (percentages.length === 0) return [];
  const rawCents = percentages.map((percentage) => (percentage / 100) * totalCents);
  return distributeRemainder(rawCents, totalCents);
}

/** Euro-amount convenience wrapper around percentagesToAmountsCents. */
export function percentagesToAmounts(percentages: number[], totalAmount: number): number[] {
  return percentagesToAmountsCents(percentages, toCents(totalAmount)).map(fromCents);
}

/** The percentage each allocation currently represents of the total, for display only -- never persisted. */
export function allocationsToPercentages(totalAmount: number, allocations: readonly { amount: number }[]): number[] {
  return amountsToPercentages(
    allocations.map((allocation) => toCents(allocation.amount)),
    toCents(totalAmount),
  );
}

/** Live "Allocated / Remaining" summary backing the split editor's readout. */
export function summarizeAllocations(
  totalAmount: number,
  allocations: readonly { amount: number }[],
): AllocationSummary {
  const totalCents = toCents(totalAmount);
  const allocatedCents = allocations.reduce((sum, allocation) => sum + toCents(allocation.amount), 0);
  const remainingCents = totalCents - allocatedCents;
  return {
    totalCents,
    allocatedCents,
    remainingCents,
    isComplete: remainingCents === 0 && allocations.length >= 2,
    isOverAllocated: remainingCents < 0,
  };
}

function targetKey(allocation: Pick<AllocationDraft, "sourceType" | "accountId" | "potId">): string | null {
  if (allocation.sourceType === "account") {
    return allocation.accountId ? `account:${allocation.accountId}` : null;
  }
  return allocation.potId ? `pot:${allocation.potId}` : null;
}

/**
 * Validates a split in full -- used both for the live UX (disable "Save"
 * until this returns []) and mirrors exactly what the server RPC checks,
 * so a client-approved split is never rejected server-side for a reason
 * the user wasn't already shown.
 */
export function validateAllocations(
  totalAmount: number,
  allocations: readonly AllocationDraft[],
): AllocationValidationError[] {
  const errors: AllocationValidationError[] = [];

  if (allocations.length < 2) {
    errors.push("too_few_allocations");
  }

  if (allocations.some((allocation) => !targetKey(allocation))) {
    errors.push("missing_target");
  }

  if (allocations.some((allocation) => !Number.isFinite(allocation.amount) || toCents(allocation.amount) <= 0)) {
    errors.push("non_positive_amount");
  }

  const seen = new Set<string>();
  let hasDuplicate = false;
  for (const allocation of allocations) {
    const key = targetKey(allocation);
    if (!key) continue;
    if (seen.has(key)) hasDuplicate = true;
    seen.add(key);
  }
  if (hasDuplicate) {
    errors.push("duplicate_source");
  }

  const { remainingCents } = summarizeAllocations(totalAmount, allocations);
  if (remainingCents !== 0) {
    errors.push("sum_mismatch");
  }

  return errors;
}

/** Payload shape the save_transaction_allocations RPC expects. */
export type AllocationRpcPayload = {
  source_type: AllocationSourceType;
  account_id: string | null;
  pot_id: string | null;
  amount: number;
};

export function allocationsToRpcPayload(allocations: readonly AllocationDraft[]): AllocationRpcPayload[] {
  return allocations.map((allocation) => ({
    source_type: allocation.sourceType,
    account_id: allocation.sourceType === "account" ? allocation.accountId : null,
    pot_id: allocation.sourceType === "pot" ? allocation.potId : null,
    amount: fromCents(toCents(allocation.amount)),
  }));
}

let clientAllocationIdCounter = 0;

/** Deterministic-enough client-local id generator for new allocation rows (React keys only, never persisted). */
export function createAllocationDraftId(): string {
  clientAllocationIdCounter += 1;
  return `allocation-${clientAllocationIdCounter}-${Date.now()}`;
}

export function createEmptyAllocationDraft(sourceType: AllocationSourceType = "account"): AllocationDraft {
  return {
    id: createAllocationDraftId(),
    sourceType,
    accountId: null,
    potId: null,
    amount: 0,
  };
}

// ============================================================
// Read-side helpers: the transaction list's `allocations` breakdown
// ============================================================
// Shape returned by list_transaction_movements' `allocations` jsonb column
// (see 20260821090000_transaction_movements_allocations.sql) for a split
// transaction's row. Distinct from AllocationDraft (the write-side/editor
// shape) since this one carries denormalized display fields the RPC joins
// in (names, the account's owner) instead of client-local editor state.

export type AllocationMovementEntry = {
  id: string;
  source_type: AllocationSourceType;
  account_id: string | null;
  account_name: string | null;
  account_owner_profile_id: string | null;
  pot_id: string | null;
  pot_name: string | null;
  amount: number;
};

/** Display name for one allocation entry -- the account or pot it targets. */
export function allocationEntryName(entry: AllocationMovementEntry): string {
  return entry.source_type === "pot"
    ? (entry.pot_name ?? "")
    : (entry.account_name ?? "");
}

/**
 * Resolves "whose money" for one allocation entry, as a household member's
 * profile id (or null when it can't be attributed to one specific member --
 * either the account is shared, or it's a pot allocation and the pot isn't
 * backed by exactly one account). Callers turn the id into a display label
 * (falling back to a "Shared" string for null) the same way the rest of the
 * transaction list resolves an account's owner into a name.
 *
 * A pot backed by more than one account has no single "whose money" answer
 * without picking a specific backing account (the same ambiguity flagged in
 * docs/split-transactions-plan.md §2.1 for the split editor's source
 * picker) -- until pots track that explicitly, more-than-one (or zero)
 * backing accounts resolves to "shared" rather than guessing.
 */
export function resolveAllocationOwnerProfileId(
  entry: Pick<AllocationMovementEntry, "source_type" | "account_owner_profile_id" | "pot_id">,
  potAccountAssignments: readonly { pot_id: string; account_id: string }[],
  accountOwnerById: ReadonlyMap<string, string | null>,
): string | null {
  if (entry.source_type === "account") {
    return entry.account_owner_profile_id ?? null;
  }
  if (!entry.pot_id) return null;
  const backingAccountIds = potAccountAssignments
    .filter((row) => row.pot_id === entry.pot_id)
    .map((row) => row.account_id);
  if (backingAccountIds.length !== 1) return null;
  return accountOwnerById.get(backingAccountIds[0]) ?? null;
}

/** Whether every entry resolves to the same member (or all are unattributed/"shared"). */
export function allocationEntriesShareOneOwner(
  entries: readonly AllocationMovementEntry[],
  potAccountAssignments: readonly { pot_id: string; account_id: string }[],
  accountOwnerById: ReadonlyMap<string, string | null>,
): boolean {
  const ownerIds = entries.map((entry) =>
    resolveAllocationOwnerProfileId(entry, potAccountAssignments, accountOwnerById),
  );
  return ownerIds.every((id) => id === ownerIds[0]);
}


// ============================================================
// Leg expansion: turning one split transaction row into N per-account rows
// ============================================================

/** The minimal shape of an allocation row this module's expansion helper needs. */
export type BasicAllocationRow = {
  id: string;
  source_type: AllocationSourceType;
  account_id: string | null;
  pot_id: string | null;
  amount: number;
};

/**
 * Expands split transactions into one synthetic row per funding-source
 * allocation, so account-scoped logic written for a flat "one row per
 * transaction, one account_id, one amount" shape (Wage Flow's
 * `calculateWageFlow`, the Accounts screen's per-account history) can
 * consume split transactions without being split-aware itself: each
 * allocation becomes its own row carrying that allocation's `amount`
 * (never the full transaction total) and its own `account_id`. Items with
 * no entry in `allocationsByTransactionId` (or an empty array there --
 * i.e. every non-split transaction) pass through completely unchanged.
 *
 * A `pot` allocation has no `account_id` of its own -- money left a real
 * account, but the allocation only records which pot it funded. Resolved,
 * in order: the pot's single backing account (mirrors
 * `resolveAllocationOwnerProfileId`'s identical ambiguity rule elsewhere in
 * this module); otherwise the original transaction's own `account_id` as a
 * best-effort fallback (matches what every consumer already did, for just
 * that one slice of the split, before this function existed) -- never a
 * fabricated id that doesn't belong to a real account, which could
 * accidentally satisfy some "any other/unrecognized account" catch-all
 * rule downstream.
 *
 * Every returned row's `id` is `${originalId}:${allocationId}` so callers
 * that use `id` as a list/React key never collide two legs of the same
 * split transaction against each other.
 */
export function expandTransactionAllocationLegs<
  T extends { id: string; account_id: string; amount: number },
>(
  items: readonly T[],
  allocationsByTransactionId: ReadonlyMap<string, readonly BasicAllocationRow[]>,
  potAccountAssignments: readonly { pot_id: string; account_id: string }[] = [],
): T[] {
  if (allocationsByTransactionId.size === 0) return [...items];

  const singleBackingAccountByPotId = new Map<string, string | null>();
  function singleBackingAccountId(potId: string): string | null {
    if (singleBackingAccountByPotId.has(potId)) {
      return singleBackingAccountByPotId.get(potId) ?? null;
    }
    const backingAccountIds = potAccountAssignments
      .filter((row) => row.pot_id === potId)
      .map((row) => row.account_id);
    const resolved = backingAccountIds.length === 1 ? backingAccountIds[0] : null;
    singleBackingAccountByPotId.set(potId, resolved);
    return resolved;
  }

  const result: T[] = [];
  for (const item of items) {
    const allocations = allocationsByTransactionId.get(item.id);
    if (!allocations || allocations.length === 0) {
      result.push(item);
      continue;
    }
    for (const allocation of allocations) {
      const account_id =
        allocation.source_type === "account"
          ? (allocation.account_id ?? item.account_id)
          : (allocation.pot_id ? singleBackingAccountId(allocation.pot_id) : null) ?? item.account_id;
      result.push({
        ...item,
        id: `${item.id}:${allocation.id}`,
        account_id,
        amount: allocation.amount,
      });
    }
  }
  return result;
}
