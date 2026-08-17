import {
  buildAccountNetworkNodes,
  buildPotNetworkNodes,
  combineDashboardNetworkNodes,
} from "./network-data";
import type { DashboardAccount, DashboardPot, MemberDetails } from "./types";

const palette = ["#111111", "#222222", "#333333"];
const memberMap = new Map<string, MemberDetails>();

describe("buildPotNetworkNodes", () => {
  const pots: DashboardPot[] = [
    { id: "p1", name: "Holiday", balance: 100 },
    { id: "p2", name: "Empty pot", balance: 0 },
    { id: "p3", name: "Emergency", balance: 500 },
  ];

  it("drops zero-balance pots and sorts the rest largest first", () => {
    const nodes = buildPotNetworkNodes(pots, palette, "Pots");
    expect(nodes.map((n) => n.id)).toEqual(["p3", "p1"]);
  });

  it("uses a flag icon and the given generic sublabel for every pot", () => {
    const nodes = buildPotNetworkNodes(pots, palette, "Pots");
    for (const node of nodes) {
      expect(node.icon).toBe("flag-outline");
      expect(node.sublabel).toBe("Pots");
    }
  });
});

describe("combineDashboardNetworkNodes", () => {
  it("merges accounts and pots into one list sorted by magnitude, largest first", () => {
    const accounts: DashboardAccount[] = [
      { id: "a1", name: "Checking", type: "bank", owner_profile_id: null, current_balance: 50 },
    ];
    const accountNodes = buildAccountNetworkNodes(accounts, memberMap, palette, "Shared", "Unnamed");
    const potNodes = buildPotNetworkNodes(
      [{ id: "p1", name: "Emergency", balance: 500 }],
      palette,
      "Pots",
    );

    const combined = combineDashboardNetworkNodes(accountNodes, potNodes, palette);
    expect(combined.map((n) => n.id)).toEqual(["p1", "a1"]);
  });

  it("re-colors the combined list across the whole palette rather than reusing each source's own rotation", () => {
    const accountNodes = buildAccountNetworkNodes(
      [
        { id: "a1", name: "A", type: "bank", owner_profile_id: null, current_balance: 10 },
        { id: "a2", name: "B", type: "bank", owner_profile_id: null, current_balance: 9 },
      ],
      memberMap,
      palette,
      "Shared",
      "Unnamed",
    );
    const potNodes = buildPotNetworkNodes([{ id: "p1", name: "Pot", balance: 8 }], palette, "Pots");

    const combined = combineDashboardNetworkNodes(accountNodes, potNodes, palette);
    expect(combined.map((n) => n.color)).toEqual([palette[0], palette[1], palette[2]]);
  });

  it("handles an entirely empty input", () => {
    expect(combineDashboardNetworkNodes([], [], palette)).toEqual([]);
  });
});
