// Per-transaction source choices in the replenishment wizard's preview step.
//
// computeMinimalUnitTransfers proposes which source funds each selected
// unit; the user can then pick a different account for any unit. An
// overridden unit is funded wholly by the chosen account, every other unit
// keeps the suggestion, and the per-source totals are derived from the
// result instead of the amounts typed in the sources step.

import type { SettlementUnit, SettlementUnitSource } from "./settlement";

export function applyUnitOverrides(
  assignments: SettlementUnitSource[],
  overrides: Map<string, string>,
  units: SettlementUnit[],
): SettlementUnitSource[] {
  if (overrides.size === 0) return assignments;

  const unitByKey = new Map(units.map((unit) => [unit.unitKey, unit]));
  const result: SettlementUnitSource[] = [];
  const emitted = new Set<string>();

  for (const assignment of assignments) {
    const override = overrides.get(assignment.unitKey);
    const unit = unitByKey.get(assignment.unitKey);
    if (!override || !unit) {
      result.push(assignment);
      continue;
    }
    if (emitted.has(unit.unitKey)) continue;
    emitted.add(unit.unitKey);
    result.push({
      unitKey: unit.unitKey,
      accountId: unit.accountId,
      sourceAccountId: override,
      amountCents: unit.amountCents,
    });
  }

  return result;
}

/** Cents per source account across all assignments. */
export function deriveSourceAmounts(assignments: SettlementUnitSource[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const assignment of assignments) {
    totals.set(assignment.sourceAccountId, (totals.get(assignment.sourceAccountId) ?? 0) + assignment.amountCents);
  }
  return totals;
}
