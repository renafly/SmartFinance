// Editing which account funded each covered transaction of an
// already-confirmed replenishment run (update_replenishment_run_sources).
//
// The detail screen lets the user pick one account per covered unit; this
// turns that selection into the RPC payload, sending only units whose
// choice differs from what the run currently records.

import { fromCents, toCents } from "./algorithm/money";

export type RecordedUnitSource = {
  source_type: string;
  account_id: string | null;
  pot_id: string | null;
  amount: number;
};

/** The slice of a replenishment_run_transactions row this module needs --
 * ReplenishmentRunDetail["transactions"][number] satisfies it. */
export type EditableRunUnit = {
  id: string;
  transaction_id: string;
  /** The unit's ORIGINAL account (the one that was replenished). */
  account_id: string;
  new_sources: RecordedUnitSource[] | null;
};

/** update_replenishment_run_sources' p_unit_sources element. */
export type UpdateReplenishmentUnitSources = {
  transactionId: string;
  accountId: string;
  sources: { accountId: string; amount: number }[];
};

function recordedSources(unit: EditableRunUnit): RecordedUnitSource[] {
  return Array.isArray(unit.new_sources) ? unit.new_sources : [];
}

/** Whether this unit's funding can be edited: only units confirmed under the
 * direct-reassignment model have recorded sources (legacy transfer-based
 * runs have none). */
export function isEditableUnit(unit: EditableRunUnit): boolean {
  return recordedSources(unit).length > 0;
}

/** The single account currently funding this unit, or null when it is
 * funded by several sources, by a pot, or has nothing recorded. */
export function currentSoleSourceAccountId(unit: EditableRunUnit): string | null {
  const sources = recordedSources(unit);
  if (sources.length !== 1) return null;
  const [source] = sources;
  return source.source_type === "account" ? source.account_id : null;
}

/** RPC payload for the units whose selected account (keyed by the run
 * transaction row id) differs from what they are funded by today. */
export function buildUpdatePayload(
  units: EditableRunUnit[],
  selection: Map<string, string>,
): UpdateReplenishmentUnitSources[] {
  const payload: UpdateReplenishmentUnitSources[] = [];
  for (const unit of units) {
    const selected = selection.get(unit.id);
    if (!selected || !isEditableUnit(unit)) continue;
    if (selected === currentSoleSourceAccountId(unit)) continue;

    const amountCents = recordedSources(unit).reduce((sum, source) => sum + toCents(Number(source.amount)), 0);
    payload.push({
      transactionId: unit.transaction_id,
      accountId: unit.account_id,
      sources: [{ accountId: selected, amount: fromCents(amountCents) }],
    });
  }
  return payload;
}
