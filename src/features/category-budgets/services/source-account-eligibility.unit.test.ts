import { getEligibleSourceAccounts, pickDefaultSourceAccountId } from "./source-account-eligibility";

type Acc = { id: string; type: "cash" | "bank" | "credit_card" | "savings" | "investment" | "ppr"; owner_profile_id: string | null; is_archived: boolean };

const acc = (id: string, type: Acc["type"], owner: string | null = null, is_archived = false): Acc => ({ id, type, owner_profile_id: owner, is_archived });

describe("getEligibleSourceAccounts", () => {
  it("offers every non-archived account regardless of type or owner (no cash/bank-only filter)", () => {
    const accounts = [acc("cc", "credit_card", "me"), acc("sav", "savings"), acc("bank", "bank", "partner"), acc("old", "bank", null, true)];
    expect(getEligibleSourceAccounts(accounts, "").map((a) => a.id)).toEqual(["cc", "sav", "bank"]);
  });

  it("keeps the currently selected account even if it was archived", () => {
    const accounts = [acc("old", "bank", null, true), acc("cc", "credit_card")];
    expect(getEligibleSourceAccounts(accounts, "old").map((a) => a.id)).toEqual(["old", "cc"]);
  });

  it("returns an empty list when the household has no usable accounts", () => {
    expect(getEligibleSourceAccounts([acc("old", "bank", null, true)], "")).toEqual([]);
  });
});

describe("pickDefaultSourceAccountId", () => {
  it("prefers the current user's own cash/bank account", () => {
    const accounts = [acc("shared", "bank"), acc("partner", "bank", "partner"), acc("mine", "bank", "me")];
    expect(pickDefaultSourceAccountId(accounts, "me")).toBe("mine");
  });

  it("falls back to a shared cash/bank account, then any cash/bank account", () => {
    expect(pickDefaultSourceAccountId([acc("partner", "bank", "partner"), acc("shared", "cash")], "me")).toBe("shared");
    expect(pickDefaultSourceAccountId([acc("partner", "bank", "partner")], "me")).toBe("partner");
  });

  it("falls back to any eligible account when there is no cash/bank account", () => {
    expect(pickDefaultSourceAccountId([acc("old", "bank", "me", true), acc("cc", "credit_card", "me")], "me")).toBe("cc");
  });

  it("returns an empty id when nothing is eligible", () => {
    expect(pickDefaultSourceAccountId([], "me")).toBe("");
  });
});
