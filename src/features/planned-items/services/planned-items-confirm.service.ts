import { repositories } from "@/repositories";
import type { Json } from "@/types/database.types";

import { resolvePlannedMonth } from "./planned-items-resolver";
import {
  rowToMonthlyBudgetPeriod,
  rowToPlannedItemMatch,
  rowToPlannedItemOccurrence,
  rowToPlannedItemOccurrenceDestination,
  rowToPlannedItemWithDestinations,
} from "./planned-items.service";
import type {
  MonthlyBudgetPeriod,
  PlannedItemAccountLike,
  PlannedItemMatch,
  PlannedItemOccurrence,
  ResolvedMonth,
  ResolvedOccurrence,
} from "../types";

/** First-of-month ISO date for a "YYYY-MM" (or full date) string. */
function toMonthDate(month: string): string {
  return `${month.slice(0, 7)}-01`;
}

/**
 * Everything `materialize_planned_item_occurrences` needs for one
 * ResolvedOccurrence -- a plain subset of the shape (occurrence +
 * destinations only; transactionLegs are confirm_planned_item_month's
 * concern, not materialize's). Sent as-is; the RPC reads these exact
 * camelCase keys out of the jsonb payload (see the migration's doc
 * comment on materialize_planned_item_occurrences for the wire shape).
 */
function toMaterializePayload(occurrences: ResolvedOccurrence[]): Json {
  return occurrences.map((resolved) => ({
    occurrence: resolved.occurrence,
    destinations: resolved.destinations,
  })) as unknown as Json;
}

/**
 * Everything `confirm_planned_item_month` needs -- the flattened
 * per-occurrence transaction-leg plan, one array entry per transaction
 * row it will insert. Only occurrences still 'planned' and not
 * is_estimate ever contribute legs (an is_estimate occurrence stays
 * 'planned' until it's individually matched via matchOccurrence, never
 * through a month-wide confirm).
 */
function toTransferPlanPayload(occurrences: ResolvedOccurrence[]): Json {
  return occurrences
    .filter((resolved) => resolved.occurrence.status === "planned" && !resolved.occurrence.isEstimate)
    .flatMap((resolved) => resolved.transactionLegs.map((leg) => ({ occurrenceId: resolved.occurrence.id, ...leg })))
    .filter((leg) => leg.occurrenceId) as unknown as Json;
}

class PlannedItemsConfirmService {
  /**
   * Pure resolve, no writes -- fetches every input resolvePlannedMonth
   * needs and runs it. Used internally by previewMonth (which *does*
   * write, via materialize) and available on its own for a "what would
   * this month look like" read-only check.
   */
  async resolveMonth(householdId: string, month: string): Promise<ResolvedMonth> {
    const normalizedMonth = toMonthDate(month);

    const [itemsResult, occurrencesResult, accountsResult] = await Promise.all([
      repositories.plannedItems.listForHousehold(householdId),
      repositories.plannedItems.listOccurrencesForMonth(householdId, normalizedMonth),
      repositories.accounts.listForHousehold(householdId, true),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (occurrencesResult.error) throw occurrencesResult.error;
    if (accountsResult.error) throw accountsResult.error;

    const occurrenceIds = occurrencesResult.data.map((occurrence) => occurrence.id);
    const destinationsResult = await repositories.plannedItems.listOccurrenceDestinations(occurrenceIds);
    if (destinationsResult.error) throw destinationsResult.error;

    const accounts: PlannedItemAccountLike[] = accountsResult.data.map((account) => ({
      id: account.id,
      type: account.type,
    }));

    return resolvePlannedMonth({
      householdId,
      month: normalizedMonth,
      plannedItems: itemsResult.data.map(rowToPlannedItemWithDestinations),
      existingOccurrences: occurrencesResult.data.map(rowToPlannedItemOccurrence),
      existingOccurrenceDestinations: destinationsResult.data.map(rowToPlannedItemOccurrenceDestination),
      accounts,
    });
  }

  /**
   * Resolves the month AND materializes it (upserts planned_item_occurrences
   * / planned_item_occurrence_destinations for every 'create'/'refresh'
   * entry -- see materialize_planned_item_occurrences's doc comment).
   *
   * Design call: previewMonth owns materialization rather than requiring
   * a separate "materialize" step before resolving. Two consequences,
   * both intentional:
   *   1. The design's "materialize with no financial side effects" claim
   *      holds -- this never writes a transaction, only the planning
   *      tables, so it's safe to call as often as the UI wants (every
   *      time the Monthly Budget screen opens for a month, on every
   *      planned_items edit, etc).
   *   2. It resolves *twice* when there's anything to materialize: once
   *      to know what needs writing, then again (after the write) so the
   *      occurrences it returns carry their real, persisted ids instead
   *      of the resolver's "" not-yet-created sentinel -- callers (revert/
   *      match/skip/cancel, all of which take a real occurrence id) can
   *      act on a freshly previewed occurrence immediately, with no extra
   *      round trip of their own.
   * Invalid occurrences (isValid = false) are never materialized -- their
   * expected amounts/destinations may be incomplete or nonsensical, so
   * there is nothing safe to persist; they still appear in the returned
   * ResolvedMonth (from the plain resolve), just without a real DB id.
   */
  async previewMonth(householdId: string, month: string): Promise<ResolvedMonth> {
    const resolved = await this.resolveMonth(householdId, month);

    const toMaterialize = resolved.occurrences.filter(
      (occurrence) => (occurrence.action === "create" || occurrence.action === "refresh") && occurrence.isValid,
    );

    if (toMaterialize.length === 0) {
      return resolved;
    }

    const { error } = await repositories.plannedItems.materializeOccurrences(
      householdId,
      toMonthDate(month),
      toMaterializePayload(toMaterialize),
    );
    if (error) throw error;

    return this.resolveMonth(householdId, month);
  }

  /**
   * Re-previews (so confirmation always acts on freshly materialized
   * state, never a stale client-held resolve), then hands the precomputed
   * transfer plan to confirm_planned_item_month. All-or-nothing: any
   * invalid occurrence blocks the whole confirm, same as the legacy
   * monthly-budget.service.ts's confirmRun.
   */
  async confirmMonth(householdId: string, month: string, confirmedBy: string): Promise<MonthlyBudgetPeriod> {
    const resolved = await this.previewMonth(householdId, month);

    const firstIssue = resolved.occurrences.find((occurrence) => !occurrence.isValid)?.validationIssues[0];
    if (firstIssue) throw new Error(firstIssue);

    const { data, error } = await repositories.plannedItems.confirmMonth(
      householdId,
      toMonthDate(month),
      toTransferPlanPayload(resolved.occurrences),
      confirmedBy,
    );
    if (error) throw error;
    return rowToMonthlyBudgetPeriod(data);
  }

  /** Client-side mirror of the RPC's own guard (only while the owning month is 'open') -- fails fast with the same message rather than waiting on a round trip to find out. */
  async revertOccurrence(occurrenceId: string, householdId: string, month: string): Promise<PlannedItemOccurrence> {
    const normalizedMonth = toMonthDate(month);
    const periodResult = await repositories.plannedItems.getMonthlyBudgetPeriod(householdId, normalizedMonth);
    if (periodResult.error) throw periodResult.error;

    const status = periodResult.data?.status ?? "open";
    if (status !== "open") {
      throw new Error(`Cannot revert: month ${month.slice(0, 7)} is ${status}, edit the transaction directly instead.`);
    }

    const { data, error } = await repositories.plannedItems.revertOccurrence(occurrenceId);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  /** Bulk revert of an entire month -- deletes every transaction this
   * month's confirm generated, resets its 'confirmed' occurrences back to
   * 'planned', and reopens the monthly_budget_periods row so the month
   * can be edited and re-confirmed. Unlike revertOccurrence, this is not
   * gated on the month already being 'open' -- reopening a committed/
   * closed month is the whole point of calling it (see
   * 20260901002200_revert_monthly_budget_month.sql). */
  async revertMonth(householdId: string, month: string): Promise<MonthlyBudgetPeriod> {
    const { data, error } = await repositories.plannedItems.revertMonth(householdId, toMonthDate(month));
    if (error) throw error;
    return rowToMonthlyBudgetPeriod(data);
  }

  async matchOccurrence(occurrenceId: string, transactionId: string, matchedBy: string): Promise<PlannedItemOccurrence> {
    const { data, error } = await repositories.plannedItems.matchOccurrence(occurrenceId, transactionId, matchedBy);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  async unmatchOccurrence(occurrenceId: string): Promise<PlannedItemOccurrence> {
    const { data, error } = await repositories.plannedItems.unmatchOccurrence(occurrenceId);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  async skipOccurrence(occurrenceId: string): Promise<PlannedItemOccurrence> {
    const { data, error } = await repositories.plannedItems.skipOccurrence(occurrenceId);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  async cancelOccurrence(occurrenceId: string): Promise<PlannedItemOccurrence> {
    const { data, error } = await repositories.plannedItems.cancelOccurrence(occurrenceId);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  async resetOccurrenceToTemplate(occurrenceId: string): Promise<PlannedItemOccurrence> {
    const { data, error } = await repositories.plannedItems.resetOccurrenceToTemplate(occurrenceId);
    if (error) throw error;
    return rowToPlannedItemOccurrence(data);
  }

  async getMatches(occurrenceIds: string[]): Promise<PlannedItemMatch[]> {
    const { data, error } = await repositories.plannedItems.listMatches(occurrenceIds);
    if (error) throw error;
    return (data ?? []).map(rowToPlannedItemMatch);
  }
}

export const plannedItemsConfirmService = new PlannedItemsConfirmService();
