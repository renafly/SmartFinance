import { buildUpdatePayload, currentSoleSourceAccountId, type EditableRunUnit } from "./edit-sources";

const ORIG = "orig-account";
const SAUDE = "saude-account";
const ACTIVO = "activo-account";

function unit(id: string, newSources: EditableRunUnit["new_sources"]): EditableRunUnit {
  return { id, transaction_id: `tx-${id}`, account_id: ORIG, new_sources: newSources };
}

const prenda = unit("prenda", [{ source_type: "account", account_id: SAUDE, pot_id: null, amount: 64.15 }]);
const eco = unit("eco", [{ source_type: "account", account_id: ACTIVO, pot_id: null, amount: 140 }]);
const continente = unit("continente", [
  { source_type: "account", account_id: SAUDE, pot_id: null, amount: 3 },
  { source_type: "account", account_id: ACTIVO, pot_id: null, amount: 4.38 },
]);
const legacy = unit("legacy", null);

describe("currentSoleSourceAccountId", () => {
  it("returns the account of a unit funded by exactly one account", () => {
    expect(currentSoleSourceAccountId(prenda)).toBe(SAUDE);
  });

  it("returns null for a unit funded by more than one source", () => {
    expect(currentSoleSourceAccountId(continente)).toBeNull();
  });

  it("returns null for a unit without recorded sources", () => {
    expect(currentSoleSourceAccountId(legacy)).toBeNull();
  });
});

describe("buildUpdatePayload", () => {
  it("returns nothing when every selection matches the current source", () => {
    const selection = new Map([
      [prenda.id, SAUDE],
      [eco.id, ACTIVO],
    ]);
    expect(buildUpdatePayload([prenda, eco], selection)).toEqual([]);
  });

  it("sends only changed units, with the unit's full replenished amount", () => {
    const selection = new Map([
      [prenda.id, ACTIVO],
      [eco.id, ACTIVO],
    ]);
    expect(buildUpdatePayload([prenda, eco], selection)).toEqual([
      { transactionId: "tx-prenda", accountId: ORIG, sources: [{ accountId: ACTIVO, amount: 64.15 }] },
    ]);
  });

  it("moves a split unit wholly to the chosen account, summing in cents", () => {
    const selection = new Map([[continente.id, ACTIVO]]);
    expect(buildUpdatePayload([continente], selection)).toEqual([
      { transactionId: "tx-continente", accountId: ORIG, sources: [{ accountId: ACTIVO, amount: 7.38 }] },
    ]);
  });

  it("ignores units without recorded sources and units with no selection", () => {
    const selection = new Map([[legacy.id, ACTIVO]]);
    expect(buildUpdatePayload([legacy, prenda], selection)).toEqual([]);
  });
});
