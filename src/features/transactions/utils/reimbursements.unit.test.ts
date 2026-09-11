import {
  computeEffectiveAmount,
  createEmptyReimbursementDraft,
  validateReimbursementAllocations,
  validateReimbursementDraft,
  type ReimbursementDraft,
} from "./reimbursements";

function row(overrides: Partial<ReimbursementDraft> = {}): ReimbursementDraft {
  return { ...createEmptyReimbursementDraft(), payerName: "Ana", amount: 0, ...overrides };
}

describe("computeEffectiveAmount", () => {
  it("returns the full original amount when there are no reimbursements", () => {
    const result = computeEffectiveAmount(100, []);
    expect(result).toEqual({
      originalAmount: 100,
      reimbursedTotal: 0,
      effectiveAmount: 100,
      isFullyReimbursed: false,
      isOverReimbursed: false,
    });
  });

  it("nets a partial reimbursement", () => {
    const result = computeEffectiveAmount(100, [{ amount: 30 }]);
    expect(result.reimbursedTotal).toBe(30);
    expect(result.effectiveAmount).toBe(70);
    expect(result.isFullyReimbursed).toBe(false);
    expect(result.isOverReimbursed).toBe(false);
  });

  it("nets a total reimbursement to exactly zero", () => {
    const result = computeEffectiveAmount(100, [{ amount: 60 }, { amount: 40 }]);
    expect(result.reimbursedTotal).toBe(100);
    expect(result.effectiveAmount).toBe(0);
    expect(result.isFullyReimbursed).toBe(true);
    expect(result.isOverReimbursed).toBe(false);
  });

  it("goes negative when reimbursed more than the original amount, and flags it", () => {
    const result = computeEffectiveAmount(50, [{ amount: 80 }]);
    expect(result.reimbursedTotal).toBe(80);
    expect(result.effectiveAmount).toBe(-30);
    expect(result.isFullyReimbursed).toBe(true);
    expect(result.isOverReimbursed).toBe(true);
  });

  it("sums multiple reimbursements from different payers on the same expense", () => {
    const result = computeEffectiveAmount(90, [
      { amount: 20 },
      { amount: 15.5 },
      { amount: 4.5 },
    ]);
    expect(result.reimbursedTotal).toBe(40);
    expect(result.effectiveAmount).toBe(50);
  });

  it("ignores non-positive draft rows defensively (DB rejects them outright)", () => {
    const result = computeEffectiveAmount(100, [{ amount: 30 }, { amount: 0 }, { amount: -5 }]);
    expect(result.reimbursedTotal).toBe(30);
    expect(result.effectiveAmount).toBe(70);
  });

  it("stays exact to the cent under classic floating-point-prone inputs", () => {
    const result = computeEffectiveAmount(10, [{ amount: 0.1 }, { amount: 0.2 }]);
    expect(result.reimbursedTotal).toBe(0.3);
    expect(result.effectiveAmount).toBe(9.7);
  });
});

describe("validateReimbursementDraft", () => {
  it("accepts a well-formed draft", () => {
    expect(validateReimbursementDraft({ payerName: "Ana", amount: 25 })).toEqual([]);
  });

  it("rejects a blank payer name", () => {
    expect(validateReimbursementDraft({ payerName: "   ", amount: 25 })).toEqual([
      "missing_payer_name",
    ]);
  });

  it("rejects a zero amount, so a phantom reimbursement can never be saved", () => {
    expect(validateReimbursementDraft({ payerName: "Ana", amount: 0 })).toEqual([
      "non_positive_amount",
    ]);
  });

  it("rejects a negative amount", () => {
    expect(validateReimbursementDraft({ payerName: "Ana", amount: -10 })).toEqual([
      "non_positive_amount",
    ]);
  });

  it("reports both errors when both are wrong", () => {
    expect(validateReimbursementDraft({ payerName: "", amount: 0 })).toEqual([
      "missing_payer_name",
      "non_positive_amount",
    ]);
  });

  it("does not require a source when the caller doesn't collect one (legacy/live-mode shape)", () => {
    expect(validateReimbursementDraft({ payerName: "Ana", amount: 25 })).toEqual([]);
  });

  it("rejects a row with a sourceType but no matching account/pot id", () => {
    expect(
      validateReimbursementDraft({ payerName: "Ana", amount: 25, sourceType: "account", accountId: null, potId: null }),
    ).toEqual(["missing_source"]);
    expect(
      validateReimbursementDraft({ payerName: "Ana", amount: 25, sourceType: "pot", accountId: null, potId: null }),
    ).toEqual(["missing_source"]);
  });

  it("accepts a row with a sourceType and a matching id", () => {
    expect(
      validateReimbursementDraft({ payerName: "Ana", amount: 25, sourceType: "account", accountId: "acc-1", potId: null }),
    ).toEqual([]);
  });
});

describe("validateReimbursementAllocations", () => {
  it("accepts a single source that matches the expected total -- unlike a funding split, one source is normal", () => {
    const rows = [row({ sourceType: "account", accountId: "acc-1", amount: 50 })];
    expect(validateReimbursementAllocations(50, rows)).toEqual([]);
  });

  it("accepts multiple sources that together match the expected total", () => {
    const rows = [
      row({ payerName: "Ana", sourceType: "account", accountId: "acc-1", amount: 30 }),
      row({ payerName: "Bruno", sourceType: "pot", potId: "pot-1", amount: 20 }),
    ];
    expect(validateReimbursementAllocations(50, rows)).toEqual([]);
  });

  it("flags a sum mismatch against the expected total", () => {
    const rows = [row({ sourceType: "account", accountId: "acc-1", amount: 30 })];
    expect(validateReimbursementAllocations(50, rows)).toContain("sum_mismatch");
  });

  it("flags a missing payer name even when the sources are otherwise valid", () => {
    const rows = [row({ payerName: "  ", sourceType: "account", accountId: "acc-1", amount: 50 })];
    expect(validateReimbursementAllocations(50, rows)).toContain("missing_payer_name");
  });

  it("flags a missing source target, reusing transaction-allocations' own rule", () => {
    const rows = [row({ sourceType: "account", accountId: null, amount: 50 })];
    expect(validateReimbursementAllocations(50, rows)).toContain("missing_target");
  });

  it("flags a duplicate source, reusing transaction-allocations' own rule", () => {
    const rows = [
      row({ payerName: "Ana", sourceType: "account", accountId: "acc-1", amount: 25 }),
      row({ payerName: "Bruno", sourceType: "account", accountId: "acc-1", amount: 25 }),
    ];
    expect(validateReimbursementAllocations(50, rows)).toContain("duplicate_source");
  });

  it("requires at least one row", () => {
    expect(validateReimbursementAllocations(50, [])).toContain("too_few_allocations");
  });
});
