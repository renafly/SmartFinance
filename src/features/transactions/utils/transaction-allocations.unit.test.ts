import {
  allocationEntriesShareOneOwner,
  allocationEntryName,
  allocationsToPercentages,
  allocationsToRpcPayload,
  distributeEqualSplitAmounts,
  distributeEqualSplitCents,
  fromCents,
  percentagesToAmounts,
  percentagesToAmountsCents,
  resolveAllocationOwnerProfileId,
  summarizeAllocations,
  toCents,
  validateAllocations,
  type AllocationDraft,
  type AllocationMovementEntry,
} from "./transaction-allocations";

// Money-safe sum for assertions: the functions under test already do all
// arithmetic in integer cents internally, but their *output* here is a
// list of already-rounded 2-decimal numbers (percentages or euro amounts).
// Summing those with plain JS `+` can reintroduce a sub-cent binary
// floating-point residue (the classic 0.1 + 0.2 !== 0.3 issue) even though
// the values themselves are exact -- rounding the sum back to the cent
// before comparing keeps these assertions honest about what the app would
// actually display, without being a false positive/negative on float noise.
function sumRounded(values: readonly number[], decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(values.reduce((sum, value) => sum + value, 0) * factor) / factor;
}

function draft(overrides: Partial<AllocationDraft> = {}): AllocationDraft {
  // Use `"key" in overrides` rather than `??` for accountId/potId: `??`
  // treats an explicitly-passed `null` (e.g. to simulate a missing target)
  // the same as "not provided" and silently replaces it with the default,
  // which would defeat tests that intentionally pass `accountId: null`.
  const sourceType = overrides.sourceType ?? "account";
  const accountId =
    "accountId" in overrides
      ? overrides.accountId
      : sourceType === "pot"
        ? null
        : "account-1";
  const potId =
    "potId" in overrides
      ? overrides.potId
      : sourceType === "pot"
        ? "pot-1"
        : null;
  return {
    id: overrides.id ?? "a",
    sourceType,
    accountId: accountId ?? null,
    potId: potId ?? null,
    amount: overrides.amount ?? 0,
  };
}

describe("toCents / fromCents", () => {
  it("round-trips exact cent values without float drift", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(0.2)).toBe(20);
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(30)).toBe(0.3);
  });

  it("treats non-finite input as zero", () => {
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("distributeEqualSplitCents", () => {
  it("splits evenly when it divides exactly (50/50)", () => {
    expect(distributeEqualSplitCents(20000, 2)).toEqual([10000, 10000]);
  });

  it("distributes the leftover cent-by-cent to the first rows", () => {
    // 200.00 split three ways -> 66.67 / 66.67 / 66.66
    expect(distributeEqualSplitCents(20000, 3)).toEqual([6667, 6667, 6666]);
  });

  it("always sums to the original total for many-way splits", () => {
    const parts = distributeEqualSplitCents(10007, 7);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10007);
    expect(parts).toHaveLength(7);
  });

  it("returns an empty array for a non-positive count", () => {
    expect(distributeEqualSplitCents(1000, 0)).toEqual([]);
  });

  it("euro-amount wrapper matches the cent-level algorithm", () => {
    expect(distributeEqualSplitAmounts(200, 3)).toEqual([66.67, 66.67, 66.66]);
  });
});

describe("amounts <-> percentages", () => {
  it("two even sources -> 50%/50%", () => {
    const percentages = allocationsToPercentages(200, [{ amount: 100 }, { amount: 100 }]);
    expect(percentages).toEqual([50, 50]);
  });

  it("uneven values produce percentages that sum to exactly 100", () => {
    // 100 / 60 / 40 out of 200 -> 50% / 30% / 20%
    const percentages = allocationsToPercentages(200, [{ amount: 100 }, { amount: 60 }, { amount: 40 }]);
    expect(percentages).toEqual([50, 30, 20]);
    expect(sumRounded(percentages)).toBe(100);
  });

  it("three-way split produces rounded percentages that still sum to exactly 100 (33.33/33.33/33.34)", () => {
    const amountsCents = distributeEqualSplitCents(toCents(100), 3); // [3334, 3333, 3333]
    const percentages = allocationsToPercentages(
      100,
      amountsCents.map((cents) => ({ amount: fromCents(cents) })),
    );
    expect(sumRounded(percentages)).toBe(100);
    expect(percentages).toEqual([33.34, 33.33, 33.33]);
  });

  it("percentagesToAmounts always sums to exactly the total, even with 3-way rounding", () => {
    const amounts = percentagesToAmounts([33.33, 33.33, 33.34], 100);
    expect(sumRounded(amounts)).toBe(100);
  });

  it("percentagesToAmounts forces the sum to the total even when input percentages are inconsistent (over 100)", () => {
    const cents = percentagesToAmountsCents([60, 60], 10000);
    expect(cents.reduce((sum, value) => sum + value, 0)).toBe(10000);
  });

  it("percentagesToAmounts forces the sum to the total even when input percentages under-sum (under 100)", () => {
    const cents = percentagesToAmountsCents([10, 10], 10000);
    expect(cents.reduce((sum, value) => sum + value, 0)).toBe(10000);
  });

  it("value -> percentage -> value round trip lands back on the original cent-exact amounts for an even split", () => {
    const totalCents = toCents(200);
    const amountsCents = [10000, 6000, 4000];
    const percentages = allocationsToPercentages(
      200,
      amountsCents.map((cents) => ({ amount: fromCents(cents) })),
    );
    const roundTripCents = percentagesToAmountsCents(percentages, totalCents);
    expect(roundTripCents).toEqual(amountsCents);
  });

  it("handles cent-level edge amounts (0.01 / 0.02) without drift", () => {
    const percentages = allocationsToPercentages(0.03, [{ amount: 0.01 }, { amount: 0.02 }]);
    expect(sumRounded(percentages)).toBe(100);
    const amounts = percentagesToAmounts(percentages, 0.03);
    expect(sumRounded(amounts)).toBe(0.03);
  });

  it("returns all zero percentages when the total is zero (no division by zero)", () => {
    expect(allocationsToPercentages(0, [{ amount: 0 }, { amount: 0 }])).toEqual([0, 0]);
  });
});

describe("summarizeAllocations", () => {
  it("reports allocated/remaining for a single source (not yet split)", () => {
    const summary = summarizeAllocations(200, [{ amount: 200 }]);
    // A single row is a valid *total* but not a valid *split* (needs >= 2) --
    // isComplete reflects both conditions.
    expect(summary.remainingCents).toBe(0);
    expect(summary.isComplete).toBe(false);
  });

  it("reports the remaining amount for a partially allocated split", () => {
    const summary = summarizeAllocations(200, [{ amount: 100 }, { amount: 70 }]);
    expect(summary.allocatedCents).toBe(17000);
    expect(summary.remainingCents).toBe(3000);
    expect(summary.isComplete).toBe(false);
    expect(summary.isOverAllocated).toBe(false);
  });

  it("is complete at exactly zero remaining with >= 2 allocations", () => {
    const summary = summarizeAllocations(200, [{ amount: 150 }, { amount: 50 }]);
    expect(summary.remainingCents).toBe(0);
    expect(summary.isComplete).toBe(true);
  });

  it("flags over-allocation", () => {
    const summary = summarizeAllocations(200, [{ amount: 150 }, { amount: 100 }]);
    expect(summary.remainingCents).toBe(-5000);
    expect(summary.isOverAllocated).toBe(true);
  });

  it("removing a row immediately updates the remaining amount", () => {
    const allocations = [{ amount: 100 }, { amount: 60 }, { amount: 40 }];
    expect(summarizeAllocations(200, allocations).remainingCents).toBe(0);
    const afterRemoval = allocations.slice(0, 2);
    expect(summarizeAllocations(200, afterRemoval).remainingCents).toBe(4000);
  });
});

describe("validateAllocations", () => {
  it("requires at least two allocations", () => {
    const errors = validateAllocations(200, [draft({ amount: 200 })]);
    expect(errors).toContain("too_few_allocations");
  });

  it("accepts a valid two-source split (account + account)", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: 120 }),
      draft({ id: "b", accountId: "acc-2", amount: 80 }),
    ]);
    expect(errors).toEqual([]);
  });

  it("accepts a valid mixed account/pot split (several sources)", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", sourceType: "account", accountId: "acc-a", amount: 100 }),
      draft({ id: "b", sourceType: "pot", potId: "pot-b", amount: 60 }),
      draft({ id: "c", sourceType: "account", accountId: "acc-c", amount: 40 }),
    ]);
    expect(errors).toEqual([]);
  });

  it("flags a missing target", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: null, amount: 100 }),
      draft({ id: "b", accountId: "acc-2", amount: 100 }),
    ]);
    expect(errors).toContain("missing_target");
  });

  it("flags a non-positive amount", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: 0 }),
      draft({ id: "b", accountId: "acc-2", amount: 200 }),
    ]);
    expect(errors).toContain("non_positive_amount");
  });

  it("flags a negative amount", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: -10 }),
      draft({ id: "b", accountId: "acc-2", amount: 210 }),
    ]);
    expect(errors).toContain("non_positive_amount");
  });

  it("flags a duplicate account source", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: 100 }),
      draft({ id: "b", accountId: "acc-1", amount: 100 }),
    ]);
    expect(errors).toContain("duplicate_source");
  });

  it("flags a duplicate pot source", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", sourceType: "pot", potId: "pot-1", amount: 100 }),
      draft({ id: "b", sourceType: "pot", potId: "pot-1", amount: 100 }),
    ]);
    expect(errors).toContain("duplicate_source");
  });

  it("does not flag the same target id used once as an account and once as a pot (different source types)", () => {
    // Same-shaped id string on purpose -- sourceType makes these different sources.
    const errors = validateAllocations(200, [
      draft({ id: "a", sourceType: "account", accountId: "shared-1", amount: 100 }),
      draft({ id: "b", sourceType: "pot", potId: "shared-1", amount: 100 }),
    ]);
    expect(errors).not.toContain("duplicate_source");
  });

  it("flags a sum mismatch (under-allocated)", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: 100 }),
      draft({ id: "b", accountId: "acc-2", amount: 50 }),
    ]);
    expect(errors).toContain("sum_mismatch");
  });

  it("flags a sum mismatch (over-allocated)", () => {
    const errors = validateAllocations(200, [
      draft({ id: "a", accountId: "acc-1", amount: 150 }),
      draft({ id: "b", accountId: "acc-2", amount: 100 }),
    ]);
    expect(errors).toContain("sum_mismatch");
  });

  it("accepts cent-level values that sum exactly", () => {
    const errors = validateAllocations(0.03, [
      draft({ id: "a", accountId: "acc-1", amount: 0.01 }),
      draft({ id: "b", accountId: "acc-2", amount: 0.02 }),
    ]);
    expect(errors).toEqual([]);
  });
});

describe("allocationsToRpcPayload", () => {
  it("maps account and pot drafts to the RPC's expected shape", () => {
    const payload = allocationsToRpcPayload([
      draft({ id: "a", sourceType: "account", accountId: "acc-1", amount: 100 }),
      draft({ id: "b", sourceType: "pot", potId: "pot-1", amount: 100 }),
    ]);
    expect(payload).toEqual([
      { source_type: "account", account_id: "acc-1", pot_id: null, amount: 100 },
      { source_type: "pot", account_id: null, pot_id: "pot-1", amount: 100 },
    ]);
  });

  it("rounds amounts to the cent when converting", () => {
    const payload = allocationsToRpcPayload([draft({ amount: 66.666 })]);
    expect(payload[0].amount).toBe(66.67);
  });
});

describe("converting a normal transaction to split and back", () => {
  it("a single-source total converts cleanly into an equal split and back to a single total", () => {
    const total = 90;
    const equalSplit = distributeEqualSplitAmounts(total, 3);
    expect(equalSplit.reduce((sum, value) => sum + value, 0)).toBe(total);

    // Converting back to a single source is just summing the allocations --
    // the caller passes an empty allocations array to the RPC and restores
    // account_id/pot_id directly, so there's nothing to "reverse" here
    // beyond confirming the amounts still reconcile to the original total.
    const recombined = equalSplit.reduce((sum, value) => sum + value, 0);
    expect(recombined).toBe(total);
  });
});

// ============================================================
// Read-side helpers (transaction list "who does this entry belong to")
// ============================================================

function entry(overrides: Partial<AllocationMovementEntry> = {}): AllocationMovementEntry {
  return {
    id: overrides.id ?? "alloc-1",
    source_type: overrides.source_type ?? "account",
    account_id: overrides.account_id ?? null,
    account_name: overrides.account_name ?? null,
    account_owner_profile_id: overrides.account_owner_profile_id ?? null,
    pot_id: overrides.pot_id ?? null,
    pot_name: overrides.pot_name ?? null,
    amount: overrides.amount ?? 0,
  };
}

describe("allocationEntryName", () => {
  it("uses the account name for an account entry", () => {
    expect(allocationEntryName(entry({ source_type: "account", account_name: "Checking" }))).toBe("Checking");
  });

  it("uses the pot name for a pot entry", () => {
    expect(allocationEntryName(entry({ source_type: "pot", pot_name: "Holiday fund" }))).toBe("Holiday fund");
  });
});

describe("resolveAllocationOwnerProfileId", () => {
  it("uses the account's own owner for an account entry", () => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry({ source_type: "account", account_owner_profile_id: "user-1" }),
      [],
      new Map(),
    );
    expect(ownerId).toBe("user-1");
  });

  it("returns null (shared) for a shared account entry", () => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry({ source_type: "account", account_owner_profile_id: null }),
      [],
      new Map(),
    );
    expect(ownerId).toBeNull();
  });

  it("resolves a pot entry through its single backing account's owner", () => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry({ source_type: "pot", pot_id: "pot-1" }),
      [{ pot_id: "pot-1", account_id: "acc-1" }],
      new Map([["acc-1", "user-2"]]),
    );
    expect(ownerId).toBe("user-2");
  });

  it("treats a pot backed by more than one account as shared (no single owner)", () => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry({ source_type: "pot", pot_id: "pot-1" }),
      [
        { pot_id: "pot-1", account_id: "acc-1" },
        { pot_id: "pot-1", account_id: "acc-2" },
      ],
      new Map([
        ["acc-1", "user-2"],
        ["acc-2", "user-3"],
      ]),
    );
    expect(ownerId).toBeNull();
  });

  it("treats a pot with no backing accounts as shared", () => {
    const ownerId = resolveAllocationOwnerProfileId(
      entry({ source_type: "pot", pot_id: "pot-1" }),
      [],
      new Map(),
    );
    expect(ownerId).toBeNull();
  });
});

describe("allocationEntriesShareOneOwner", () => {
  it("is true when every entry resolves to the same member", () => {
    const shared = allocationEntriesShareOneOwner(
      [
        entry({ source_type: "account", account_owner_profile_id: "user-1" }),
        entry({ source_type: "account", account_owner_profile_id: "user-1" }),
      ],
      [],
      new Map(),
    );
    expect(shared).toBe(true);
  });

  it("is false when entries resolve to different members", () => {
    const shared = allocationEntriesShareOneOwner(
      [
        entry({ source_type: "account", account_owner_profile_id: "user-1" }),
        entry({ source_type: "account", account_owner_profile_id: "user-2" }),
      ],
      [],
      new Map(),
    );
    expect(shared).toBe(false);
  });

  it("treats two unattributed (shared) entries as the same owner", () => {
    const shared = allocationEntriesShareOneOwner(
      [
        entry({ source_type: "account", account_owner_profile_id: null }),
        entry({ source_type: "pot", pot_id: "pot-1" }),
      ],
      [],
      new Map(),
    );
    expect(shared).toBe(true);
  });
});
