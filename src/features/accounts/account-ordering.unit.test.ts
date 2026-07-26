import {
  ACCOUNT_TYPE_ORDER,
  SHARED_ACCOUNT_OWNER_KEY,
  compareAccountsByOwnerThenType,
  compareAccountsByTypeThenName,
  getAccountOwnerToneIndex,
  groupAccountsByOwner,
} from "./account-ordering";

describe("account ordering", () => {
  const accounts = [
    { name: "Holiday", type: "savings", owner_profile_id: "member-b" },
    { name: "Wallet", type: "cash", owner_profile_id: "member-a" },
    { name: "Current", type: "bank", owner_profile_id: "member-a" },
    { name: "Joint card", type: "credit_card", owner_profile_id: null },
    { name: "Joint current", type: "bank", owner_profile_id: null },
  ];

  it("uses one stable account type priority", () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual([
      "bank",
      "cash",
      "savings",
      "credit_card",
      "investment",
      "ppr",
    ]);

    expect(
      [...accounts]
        .sort(compareAccountsByTypeThenName)
        .map((account) => account.name),
    ).toEqual(["Current", "Joint current", "Wallet", "Holiday", "Joint card"]);
  });

  it("groups members in the supplied order, puts shared last, and orders by type inside each group", () => {
    const ownerOrder = ["member-a", "member-b", SHARED_ACCOUNT_OWNER_KEY];

    expect(
      [...accounts]
        .sort((left, right) =>
          compareAccountsByOwnerThenType(left, right, ownerOrder),
        )
        .map((account) => account.name),
    ).toEqual(["Current", "Wallet", "Holiday", "Joint current", "Joint card"]);
  });

  it("builds owner groups in member order with shared accounts last", () => {
    const groups = groupAccountsByOwner(accounts, [
      "member-a",
      "member-b",
      SHARED_ACCOUNT_OWNER_KEY,
    ]);

    expect(
      groups.map((group) => ({
        key: group.key,
        accounts: group.accounts.map((account) => account.name),
      })),
    ).toEqual([
      { key: "member-a", accounts: ["Current", "Wallet"] },
      { key: "member-b", accounts: ["Holiday"] },
      {
        key: SHARED_ACCOUNT_OWNER_KEY,
        accounts: ["Joint current", "Joint card"],
      },
    ]);
  });

  it("assigns a stable palette position to each owner and shared accounts", () => {
    const ownerOrder = ["member-a", "member-b", SHARED_ACCOUNT_OWNER_KEY];

    expect(getAccountOwnerToneIndex("member-a", ownerOrder, 5)).toBe(0);
    expect(getAccountOwnerToneIndex("member-b", ownerOrder, 5)).toBe(1);
    expect(getAccountOwnerToneIndex(null, ownerOrder, 5)).toBe(2);
  });
});
