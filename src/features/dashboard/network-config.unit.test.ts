import {
  buildDefaultDashboardNetworkConfig,
  excludePotAssignedAccounts,
  filterAccountsByDashboardNetworkConfig,
  filterPotsByDashboardNetworkConfig,
  getAccountNetworkGroup,
  type DashboardNetworkConfig,
} from "./network-config";

describe("getAccountNetworkGroup", () => {
  it("groups investment and ppr accounts as investmentAccountIds", () => {
    expect(getAccountNetworkGroup("investment")).toBe("investmentAccountIds");
    expect(getAccountNetworkGroup("ppr")).toBe("investmentAccountIds");
  });

  it("groups savings accounts as savingsAccountIds", () => {
    expect(getAccountNetworkGroup("savings")).toBe("savingsAccountIds");
  });

  it("falls back every-day account types to accountIds", () => {
    expect(getAccountNetworkGroup("bank")).toBe("accountIds");
    expect(getAccountNetworkGroup("cash")).toBe("accountIds");
    expect(getAccountNetworkGroup("credit_card")).toBe("accountIds");
  });
});

describe("buildDefaultDashboardNetworkConfig", () => {
  it("selects every account (bucketed by type) and every pot", () => {
    const config = buildDefaultDashboardNetworkConfig({
      accounts: [
        { id: "a1", type: "bank" },
        { id: "a2", type: "credit_card" },
        { id: "i1", type: "investment" },
        { id: "i2", type: "ppr" },
        { id: "s1", type: "savings" },
      ],
      pots: [{ id: "p1" }, { id: "p2" }],
    });

    expect(config).toEqual<DashboardNetworkConfig>({
      accountIds: ["a1", "a2"],
      investmentAccountIds: ["i1", "i2"],
      savingsAccountIds: ["s1"],
      potIds: ["p1", "p2"],
    });
  });

  it("returns empty groups when there is nothing to select", () => {
    expect(buildDefaultDashboardNetworkConfig({ accounts: [], pots: [] })).toEqual({
      accountIds: [],
      investmentAccountIds: [],
      savingsAccountIds: [],
      potIds: [],
    });
  });
});

describe("filterAccountsByDashboardNetworkConfig", () => {
  const accounts = [
    { id: "a1", type: "bank" },
    { id: "a2", type: "credit_card" },
    { id: "i1", type: "investment" },
    { id: "s1", type: "savings" },
  ];

  it("keeps only accounts selected in their type's group", () => {
    const config: DashboardNetworkConfig = {
      accountIds: ["a1"],
      investmentAccountIds: ["i1"],
      savingsAccountIds: [],
      potIds: [],
    };

    expect(filterAccountsByDashboardNetworkConfig(accounts, config).map((a) => a.id)).toEqual([
      "a1",
      "i1",
    ]);
  });

  it("never lets a savings selection leak into the accounts group (and vice versa)", () => {
    const config: DashboardNetworkConfig = {
      accountIds: ["a1", "a2"],
      investmentAccountIds: [],
      savingsAccountIds: ["s1"],
      potIds: [],
    };

    // s1 is selected, but as a savings account it must never satisfy the
    // accountIds bucket for a same-named id collision, and a1/a2 must never
    // satisfy the savings bucket -- groups stay fully independent.
    const result = filterAccountsByDashboardNetworkConfig(accounts, config);
    expect(result.map((a) => a.id).sort()).toEqual(["a1", "a2", "s1"]);
  });

  it("returns nothing when every group is empty", () => {
    const config: DashboardNetworkConfig = {
      accountIds: [],
      investmentAccountIds: [],
      savingsAccountIds: [],
      potIds: [],
    };

    expect(filterAccountsByDashboardNetworkConfig(accounts, config)).toEqual([]);
  });
});

describe("excludePotAssignedAccounts", () => {
  it("drops an account backing a pot, matching the Dashboard double-counting fix", () => {
    // e.g. a "savings"-type account assigned to an "Emergency Fund" pot --
    // its balance must only show up once (under the pot), not again under
    // the Savings Accounts total/bucket.
    const accounts = [
      { id: "s1", type: "savings" }, // backs a pot
      { id: "s2", type: "savings" }, // does not back a pot
      { id: "i1", type: "investment" },
    ];

    expect(
      excludePotAssignedAccounts(accounts, new Set(["s1"])).map((a) => a.id),
    ).toEqual(["s2", "i1"]);
  });

  it("accepts a plain iterable, not just a Set", () => {
    const accounts = [{ id: "a1", type: "bank" }, { id: "a2", type: "bank" }];
    expect(excludePotAssignedAccounts(accounts, ["a1"]).map((a) => a.id)).toEqual(["a2"]);
  });

  it("is a no-op when nothing is pot-assigned", () => {
    const accounts = [{ id: "a1", type: "bank" }, { id: "s1", type: "savings" }];
    expect(excludePotAssignedAccounts(accounts, new Set()).map((a) => a.id)).toEqual([
      "a1",
      "s1",
    ]);
  });

  it("composes with buildDefaultDashboardNetworkConfig so a pot-backed account never appears in the default selection", () => {
    const allAccounts = [
      { id: "s1", type: "savings" },
      { id: "s2", type: "savings" },
    ];
    const eligible = excludePotAssignedAccounts(allAccounts, new Set(["s1"]));
    const config = buildDefaultDashboardNetworkConfig({ accounts: eligible, pots: [{ id: "p1" }] });

    expect(config.savingsAccountIds).toEqual(["s2"]);
    expect(config.potIds).toEqual(["p1"]);
  });
});

describe("filterPotsByDashboardNetworkConfig", () => {
  const pots = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];

  it("keeps only the selected pots", () => {
    const config: DashboardNetworkConfig = {
      accountIds: [],
      investmentAccountIds: [],
      savingsAccountIds: [],
      potIds: ["p1", "p3"],
    };

    expect(filterPotsByDashboardNetworkConfig(pots, config).map((p) => p.id)).toEqual([
      "p1",
      "p3",
    ]);
  });

  it("returns nothing when potIds is empty", () => {
    const config: DashboardNetworkConfig = {
      accountIds: [],
      investmentAccountIds: [],
      savingsAccountIds: [],
      potIds: [],
    };

    expect(filterPotsByDashboardNetworkConfig(pots, config)).toEqual([]);
  });
});
