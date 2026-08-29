import type { PlannedItemDirection, PlannedItemOccurrence, PlannedItemWithDestinations } from "../types";
import { isPlannedItemDueInMonth, splitEqualRemainderLast, splitPercentRemainderLast } from "./planned-items-resolver";

// ============================================================
// Planned Item Forecast Contributions
// ============================================================
// The single source of truth for "which future calendar months will a
// planned_items destination move money, and which of those months are
// already accounted for" -- consumed by BOTH saving-pot-forecast.service.ts
// (the Savings list's completion-date forecast) and
// balance-forecast.service.ts (the account/pot balance graph), so the two
// views can never again disagree about whether a given month's Monthly
// Budget contribution has already happened. Replaces the old
// budget_rules/monthly_budget_runs-based sourcing in both of those, which
// went stale the moment a household migrated onto planned_items (see
// monthly-budget.service.ts's doc comment -- those tables are write-dead).
//
// Key rule: a contribution is never projected for a month whose real
// planned_item_occurrence is already 'confirmed'/'matched' (the money
// already moved and is reflected in the current balance) or
// 'skipped'/'cancelled' (the money will never move for that month) -- this
// is determined per (planned item, calendar month) from real data, never
// from "is this the current calendar month". A reverted occurrence goes
// back to 'planned' and is therefore automatically eligible again the next
// time this function runs, with no extra bookkeeping.

export type PlannedItemForecastContribution = {
  plannedItemId: string;
  /** Stable per-(item, destination account) key -- unique across every contribution this function returns. */
  destinationKey: string;
  destinationAccountId: string;
  /** Null for an inflow item (income has no source account). */
  sourceAccountId: string | null;
  direction: PlannedItemDirection;
  amount: number;
  /** Sorted "YYYY-MM" months, from `asOf`'s month through the horizon, this destination is due in per isPlannedItemDueInMonth. */
  dueMonthKeys: string[];
  /** Subset of dueMonthKeys already settled one way or another (executed, matched, skipped, or cancelled) -- must never be projected as a still-upcoming contribution. */
  skipMonthKeys: string[];
};

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

const SETTLED_OCCURRENCE_STATUSES = new Set(["confirmed", "matched", "skipped", "cancelled"]);

function buildHorizonMonthKeys(asOf: Date, horizonMonths: number): string[] {
  const months: string[] = [];
  for (let i = 0; i <= horizonMonths; i += 1) {
    const date = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + i, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  return months;
}

/**
 * Resolves each active planned item's per-destination amounts (mirroring
 * buildFreshLegs's allocation-mode math in planned-items-resolver.ts,
 * since that's the one implementation of "how much does destination N of
 * this item get" this codebase should have) and, for every destination,
 * the months it's due in over the requested horizon plus which of those
 * months are already settled.
 */
export function buildPlannedItemForecastContributions(input: {
  plannedItems: PlannedItemWithDestinations[];
  occurrences: PlannedItemOccurrence[];
  asOf: Date;
  horizonMonths: number;
}): PlannedItemForecastContribution[] {
  const occurrenceByItemAndMonth = new Map<string, PlannedItemOccurrence>();
  for (const occurrence of input.occurrences) {
    occurrenceByItemAndMonth.set(`${occurrence.plannedItemId}:${occurrence.month.slice(0, 7)}`, occurrence);
  }

  const horizonMonthKeys = buildHorizonMonthKeys(input.asOf, input.horizonMonths);
  const contributions: PlannedItemForecastContribution[] = [];

  for (const item of input.plannedItems) {
    if (!item.isActive) continue;

    const sortedDestinations = [...item.destinations].sort((a, b) => a.sortOrder - b.sortOrder);
    // A plain expense (outflow, zero destinations) never funds an account
    // this module can forecast against, so it's out of scope here.
    if (sortedDestinations.length === 0) continue;

    let amounts: number[];
    switch (item.allocationMode) {
      case "single":
        amounts = [roundMoney(item.amount)];
        break;
      case "equal_split":
        amounts = splitEqualRemainderLast(item.amount, sortedDestinations.length);
        break;
      case "custom_amount":
        amounts = sortedDestinations.map((destination) => roundMoney(destination.amount ?? 0));
        break;
      case "custom_percent":
        amounts = splitPercentRemainderLast(
          item.amount,
          sortedDestinations.map((destination) => Number(destination.percent ?? 0)),
        );
        break;
      default:
        amounts = [];
    }

    // Recurrence is item-level (shared by every destination this item fans out to).
    const dueMonthKeys = horizonMonthKeys.filter((month) => isPlannedItemDueInMonth(item, month));
    if (dueMonthKeys.length === 0) continue;

    sortedDestinations.forEach((destination, index) => {
      const amount = amounts[index] ?? 0;
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (destination.destinationAccountId === item.sourceAccountId) return;

      const skipMonthKeys = dueMonthKeys.filter((month) => {
        const occurrence = occurrenceByItemAndMonth.get(`${item.id}:${month}`);
        return !!occurrence && SETTLED_OCCURRENCE_STATUSES.has(occurrence.status);
      });

      contributions.push({
        plannedItemId: item.id,
        destinationKey: `${item.id}:${destination.destinationAccountId}`,
        destinationAccountId: destination.destinationAccountId,
        sourceAccountId: item.direction === "outflow" ? item.sourceAccountId : null,
        direction: item.direction,
        amount,
        dueMonthKeys,
        skipMonthKeys,
      });
    });
  }

  return contributions;
}
