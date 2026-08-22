import {
  computeMinimalTransfers,
  SettlementError,
  type SettlementDestination,
  type SettlementSource,
} from "./settlement";

function sumBy<T>(items: T[], amount: (item: T) => number) {
  return items.reduce((total, item) => total + amount(item), 0);
}

describe("computeMinimalTransfers", () => {
  it("1 source / 1 destination -> exactly 1 transfer", () => {
    const sources: SettlementSource[] = [{ accountId: "pot-x", amountCents: 10000 }];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 10000 }];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toEqual([
      { sourceAccountId: "pot-x", destinationAccountId: "a", amountCents: 10000 },
    ]);
  });

  it("matches the spec's worked example: 3 transfers total, not a 2x3=6 cross product", () => {
    // Despesas a repor: A=100, B=50, C=50. Fontes: Pote X=100, Conta Y=100.
    // Equal-amount sources tie-break alphabetically ("conta-y" < "pote-x"),
    // so conta-y fully settles A first and pote-x is left to cover B and C
    // -- still exactly 3 transfers regardless of which named source lands
    // on which destination, which is the property this test asserts.
    const sources: SettlementSource[] = [
      { accountId: "pote-x", amountCents: 10000 },
      { accountId: "conta-y", amountCents: 10000 },
    ];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 10000 },
      { accountId: "b", amountCents: 5000 },
      { accountId: "c", amountCents: 5000 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toHaveLength(3);
    expect(transfers).toEqual([
      { sourceAccountId: "conta-y", destinationAccountId: "a", amountCents: 10000 },
      { sourceAccountId: "pote-x", destinationAccountId: "b", amountCents: 5000 },
      { sourceAccountId: "pote-x", destinationAccountId: "c", amountCents: 5000 },
    ]);
    for (const destination of destinations) {
      const received = sumBy(
        transfers.filter((t) => t.destinationAccountId === destination.accountId),
        (t) => t.amountCents,
      );
      expect(received).toBe(destination.amountCents);
    }
  });

  it("unequal 2x2 split still bounded by m+n-1 transfers and sums correctly per account", () => {
    // Destinos: A=120, B=80. Fontes: X=100, Y=100. Neither source alone
    // covers a full destination, so a split is unavoidable.
    const sources: SettlementSource[] = [
      { accountId: "x", amountCents: 10000 },
      { accountId: "y", amountCents: 10000 },
    ];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 12000 },
      { accountId: "b", amountCents: 8000 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers.length).toBeLessThanOrEqual(sources.length + destinations.length - 1);
    // x fully covers the first 10000 of a's 12000; a's remaining 2000 is now
    // smaller than b's 8000, so b sorts ahead and is settled next by y,
    // leaving y's last 2000 to finish off a.
    expect(transfers).toEqual([
      { sourceAccountId: "x", destinationAccountId: "a", amountCents: 10000 },
      { sourceAccountId: "y", destinationAccountId: "b", amountCents: 8000 },
      { sourceAccountId: "y", destinationAccountId: "a", amountCents: 2000 },
    ]);

    for (const destination of destinations) {
      const received = sumBy(
        transfers.filter((t) => t.destinationAccountId === destination.accountId),
        (t) => t.amountCents,
      );
      expect(received).toBe(destination.amountCents);
    }
    for (const source of sources) {
      const sent = sumBy(
        transfers.filter((t) => t.sourceAccountId === source.accountId),
        (t) => t.amountCents,
      );
      expect(sent).toBe(source.amountCents);
    }
  });

  it("N destinations / 1 source -> exactly N transfers (a single account can only pay each destination directly)", () => {
    const sources: SettlementSource[] = [{ accountId: "s", amountCents: 30000 }];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 10000 },
      { accountId: "b", amountCents: 10000 },
      { accountId: "c", amountCents: 10000 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toHaveLength(3);
    expect(transfers.every((t) => t.sourceAccountId === "s")).toBe(true);
  });

  it("1 destination / N sources -> exactly N transfers", () => {
    const sources: SettlementSource[] = [
      { accountId: "x", amountCents: 5000 },
      { accountId: "y", amountCents: 3000 },
      { accountId: "z", amountCents: 2000 },
    ];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 10000 }];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toHaveLength(3);
    expect(transfers.every((t) => t.destinationAccountId === "a")).toBe(true);
  });

  it("N x N with equal amounts pairs off exactly N transfers (both sides retire simultaneously)", () => {
    const sources: SettlementSource[] = [
      { accountId: "x", amountCents: 10000 },
      { accountId: "y", amountCents: 10000 },
    ];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 10000 },
      { accountId: "b", amountCents: 10000 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toHaveLength(2);
  });

  it("handles a cents-exact 3-way split without losing or gaining a cent", () => {
    const sources: SettlementSource[] = [{ accountId: "s", amountCents: 10000 }];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 3334 },
      { accountId: "b", amountCents: 3333 },
      { accountId: "c", amountCents: 3333 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(sumBy(transfers, (t) => t.amountCents)).toBe(10000);
    expect(transfers).toHaveLength(3);
  });

  it("nets a same-account overlap to zero transfers for the overlapping portion", () => {
    // Account "a" both funds and is funded -- e.g. a defensive input the UI
    // should never produce, but the pure function must still handle
    // correctly: the overlapping 30 cancels out, only the remainder moves.
    const sources: SettlementSource[] = [{ accountId: "a", amountCents: 3000 }];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 3000 }];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toEqual([]);
  });

  it("nets a partial same-account overlap before settling the remainder", () => {
    const sources: SettlementSource[] = [{ accountId: "a", amountCents: 5000 }];
    const destinations: SettlementDestination[] = [
      { accountId: "a", amountCents: 2000 },
      { accountId: "b", amountCents: 3000 },
    ];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toEqual([
      { sourceAccountId: "a", destinationAccountId: "b", amountCents: 3000 },
    ]);
  });

  it("aggregates duplicate rows for the same account on either side", () => {
    const sources: SettlementSource[] = [
      { accountId: "x", amountCents: 4000 },
      { accountId: "x", amountCents: 1000 },
    ];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 5000 }];

    const transfers = computeMinimalTransfers(sources, destinations);

    expect(transfers).toEqual([
      { sourceAccountId: "x", destinationAccountId: "a", amountCents: 5000 },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(computeMinimalTransfers([], [])).toEqual([]);
  });

  it("throws when sources and destinations don't sum to the same total (under-allocated)", () => {
    const sources: SettlementSource[] = [{ accountId: "x", amountCents: 5000 }];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 10000 }];

    expect(() => computeMinimalTransfers(sources, destinations)).toThrow(SettlementError);
  });

  it("throws when sources and destinations don't sum to the same total (over-allocated)", () => {
    const sources: SettlementSource[] = [{ accountId: "x", amountCents: 15000 }];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 10000 }];

    expect(() => computeMinimalTransfers(sources, destinations)).toThrow(SettlementError);
  });

  it("throws on a negative or non-integer amount", () => {
    expect(() =>
      computeMinimalTransfers([{ accountId: "x", amountCents: -100 }], []),
    ).toThrow(SettlementError);
    expect(() =>
      computeMinimalTransfers([{ accountId: "x", amountCents: 10.5 }], []),
    ).toThrow(SettlementError);
  });

  it("is deterministic: identical input always produces identical (including order) output", () => {
    const sources: SettlementSource[] = [
      { accountId: "y", amountCents: 4200 },
      { accountId: "x", amountCents: 4200 },
      { accountId: "z", amountCents: 1600 },
    ];
    const destinations: SettlementDestination[] = [
      { accountId: "b", amountCents: 5000 },
      { accountId: "a", amountCents: 5000 },
    ];

    const first = computeMinimalTransfers(sources, destinations);
    const second = computeMinimalTransfers(
      sources.map((s) => ({ ...s })),
      destinations.map((d) => ({ ...d })),
    );

    expect(second).toEqual(first);
  });

  it("recomputes cleanly after a simulated manual edit (re-running from current state, not patching)", () => {
    const sources: SettlementSource[] = [
      { accountId: "pote-x", amountCents: 12000 },
      { accountId: "conta-y", amountCents: 8000 },
    ];
    const destinations: SettlementDestination[] = [{ accountId: "a", amountCents: 20000 }];

    const before = computeMinimalTransfers(sources, destinations);
    expect(sumBy(before, (t) => t.amountCents)).toBe(20000);

    // User manually rebalances Pote X/Conta Y from 120/80 to 100/100.
    const editedSources: SettlementSource[] = [
      { accountId: "pote-x", amountCents: 10000 },
      { accountId: "conta-y", amountCents: 10000 },
    ];
    const after = computeMinimalTransfers(editedSources, destinations);

    // Equal amounts tie-break alphabetically ("conta-y" < "pote-x").
    expect(after).toEqual([
      { sourceAccountId: "conta-y", destinationAccountId: "a", amountCents: 10000 },
      { sourceAccountId: "pote-x", destinationAccountId: "a", amountCents: 10000 },
    ]);
    expect(sumBy(after, (t) => t.amountCents)).toBe(20000);
  });
});
