import { applyUnitOverrides, deriveSourceAmounts } from "./overrides";
import type { SettlementUnit, SettlementUnitSource } from "./settlement";

const units: SettlementUnit[] = [
  { unitKey: "eco", accountId: "trading", amountCents: 14000 },
  { unitKey: "continente", accountId: "trading", amountCents: 738 },
  { unitKey: "prenda", accountId: "trade-republic", amountCents: 6415 },
];

// What computeMinimalUnitTransfers suggested: Eco from Activo, Continente
// split Saude + Activo, Prenda from Saude.
const suggested: SettlementUnitSource[] = [
  { unitKey: "eco", accountId: "trading", sourceAccountId: "activo", amountCents: 14000 },
  { unitKey: "continente", accountId: "trading", sourceAccountId: "saude", amountCents: 300 },
  { unitKey: "continente", accountId: "trading", sourceAccountId: "activo", amountCents: 438 },
  { unitKey: "prenda", accountId: "trade-republic", sourceAccountId: "saude", amountCents: 6415 },
];

describe("applyUnitOverrides", () => {
  it("leaves the suggestion unchanged without overrides", () => {
    expect(applyUnitOverrides(suggested, new Map(), units)).toEqual(suggested);
  });

  it("funds an overridden unit wholly from the chosen account", () => {
    const result = applyUnitOverrides(suggested, new Map([["eco", "saude"]]), units);
    expect(result.filter((row) => row.unitKey === "eco")).toEqual([
      { unitKey: "eco", accountId: "trading", sourceAccountId: "saude", amountCents: 14000 },
    ]);
    expect(result.filter((row) => row.unitKey === "prenda")).toEqual([suggested[3]]);
  });

  it("replaces a two-source unit with a single source", () => {
    const result = applyUnitOverrides(suggested, new Map([["continente", "activo"]]), units);
    expect(result.filter((row) => row.unitKey === "continente")).toEqual([
      { unitKey: "continente", accountId: "trading", sourceAccountId: "activo", amountCents: 738 },
    ]);
  });
});

describe("deriveSourceAmounts", () => {
  it("totals per source account sum to the units' total", () => {
    const result = applyUnitOverrides(
      suggested,
      new Map([
        ["eco", "saude"],
        ["prenda", "activo"],
      ]),
      units,
    );
    const totals = deriveSourceAmounts(result);
    expect(totals.get("saude")).toBe(14000 + 300);
    expect(totals.get("activo")).toBe(438 + 6415);
    expect([...totals.values()].reduce((sum, cents) => sum + cents, 0)).toBe(14000 + 738 + 6415);
  });
});
