import {
  effectiveTotal,
  fundingFingerprint,
  receivingAccountKeys,
  toEffectiveAllocations,
  toFullAllocations,
  validateFunding,
  type ReimbursementTarget,
} from "./funding";
import { validateAllocations, type AllocationDraft } from "./transaction-allocations";

const ACTIVO = "activo";
const SAUDE = "saude";
const OTHER = "other";

function row(id: string, accountId: string, amount: number): AllocationDraft {
  return { id, sourceType: "account", accountId, potId: null, amount };
}

const rita: ReimbursementTarget[] = [{ accountId: ACTIVO, amount: 21.39 }];

describe("effectiveTotal", () => {
  it("is the amount minus everything reimbursed, in cents", () => {
    expect(effectiveTotal(64.15, rita)).toBe(42.76);
    expect(effectiveTotal(64.15, [])).toBe(64.15);
  });
});

describe("toFullAllocations / toEffectiveAllocations", () => {
  const effective = [row("a", ACTIVO, 22.76), row("b", SAUDE, 20)];

  it("adds each reimbursement to the account that received it", () => {
    expect(toFullAllocations(effective, rita)).toEqual([row("a", ACTIVO, 44.15), row("b", SAUDE, 20)]);
  });

  it("subtracts them back when loading a saved split", () => {
    expect(toEffectiveAllocations([row("a", ACTIVO, 44.15), row("b", SAUDE, 20)], rita)).toEqual(effective);
  });

  it("round-trips the Continente case, leaving the receiving account at 0", () => {
    const full = [row("a", OTHER, 173.42), row("b", ACTIVO, 84.28)];
    const reimbursements = [{ accountId: ACTIVO, amount: 84.28 }];
    const asEffective = toEffectiveAllocations(full, reimbursements);
    expect(asEffective).toEqual([row("a", OTHER, 173.42), row("b", ACTIVO, 0)]);
    expect(toFullAllocations(asEffective!, reimbursements)).toEqual(full);
  });

  it("is the identity without reimbursements", () => {
    expect(toFullAllocations(effective, [])).toEqual(effective);
    expect(toEffectiveAllocations(effective, [])).toEqual(effective);
  });

  it("returns null when a saved split cannot hold what an account received", () => {
    expect(toEffectiveAllocations([row("a", ACTIVO, 10), row("b", SAUDE, 54.15)], rita)).toBeNull();
  });
});

describe("receivingAccountKeys", () => {
  it("lists the accounts that received money as allocation keys", () => {
    expect([...receivingAccountKeys([...rita, { accountId: ACTIVO, amount: 1 }, { accountId: null, amount: 2 }])]).toEqual([
      "account:activo",
    ]);
  });
});

describe("validateAllocations zeroAllowedTargetKeys", () => {
  it("accepts a 0 row only for an allowed target", () => {
    const rows = [row("a", ACTIVO, 0), row("b", SAUDE, 42.76)];
    expect(validateAllocations(42.76, rows)).toContain("non_positive_amount");
    expect(validateAllocations(42.76, rows, { zeroAllowedTargetKeys: new Set(["account:activo"]) })).toEqual([]);
  });
});

describe("validateFunding", () => {
  const base = { amount: 64.15, paidFromAccountId: ACTIVO };

  it("accepts the example split", () => {
    expect(
      validateFunding({ ...base, splitEnabled: true, effective: [row("a", ACTIVO, 22.76), row("b", SAUDE, 20)], reimbursements: rita }),
    ).toEqual([]);
  });

  it("requires the split to cover only the amount not reimbursed", () => {
    expect(
      validateFunding({ ...base, splitEnabled: true, effective: [row("a", ACTIVO, 44.15), row("b", SAUDE, 20)], reimbursements: rita }),
    ).toContain("sum_mismatch");
  });

  it("rejects a reimbursement received outside the split", () => {
    expect(
      validateFunding({
        ...base,
        splitEnabled: true,
        effective: [row("a", ACTIVO, 22.76), row("b", SAUDE, 20)],
        reimbursements: [{ accountId: OTHER, amount: 21.39 }],
      }),
    ).toContain("receiving_outside_split");
  });

  it("without a split, only the paid-from account can receive", () => {
    expect(validateFunding({ ...base, splitEnabled: false, effective: [], reimbursements: rita })).toEqual([]);
    expect(
      validateFunding({ ...base, splitEnabled: false, effective: [], reimbursements: [{ accountId: SAUDE, amount: 21.39 }] }),
    ).toEqual(["receiving_not_paid_from"]);
  });

  it("refuses a split when everything was reimbursed", () => {
    expect(
      validateFunding({
        ...base,
        splitEnabled: true,
        effective: [row("a", ACTIVO, 0), row("b", SAUDE, 0)],
        reimbursements: [{ accountId: ACTIVO, amount: 64.15 }],
      }),
    ).toContain("reimbursed_exceeds_amount");
  });

  it("flags a 0 row on an account that receives nothing", () => {
    expect(
      validateFunding({ ...base, splitEnabled: true, effective: [row("a", ACTIVO, 42.76), row("b", SAUDE, 0)], reimbursements: rita }),
    ).toContain("non_positive_amount");
  });
});

describe("fundingFingerprint", () => {
  const base = {
    amount: 64.15,
    splitEnabled: true,
    allocations: [row("a", ACTIVO, 22.76), row("b", SAUDE, 20)],
    reimbursements: [{ id: "r1", payerName: "Rita", amount: 21.39, accountId: ACTIVO, receivedOn: "2026-11-16", note: null }],
  };

  it("is stable for the same funding, whatever the row ids", () => {
    expect(fundingFingerprint(base)).toBe(
      fundingFingerprint({ ...base, allocations: [row("x", ACTIVO, 22.76), row("y", SAUDE, 20)] }),
    );
  });

  it("changes when the split, a reimbursement or the amount changes", () => {
    const original = fundingFingerprint(base);
    expect(fundingFingerprint({ ...base, allocations: [row("a", ACTIVO, 20), row("b", SAUDE, 22.76)] })).not.toBe(original);
    expect(fundingFingerprint({ ...base, reimbursements: [] })).not.toBe(original);
    expect(fundingFingerprint({ ...base, amount: 70 })).not.toBe(original);
    expect(fundingFingerprint({ ...base, splitEnabled: false })).not.toBe(original);
  });
});
