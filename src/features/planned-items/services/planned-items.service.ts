import { repositories } from "@/repositories";
import type {
  MonthlyBudgetPeriodRow,
  PlannedItemDestinationInsert,
  PlannedItemDestinationRow,
  PlannedItemInsert,
  PlannedItemMatchRow,
  PlannedItemOccurrenceDestinationRow,
  PlannedItemOccurrenceRow,
  PlannedItemRow,
  PlannedItemRowWithDestinations,
  PlannedItemUpdate,
} from "@/repositories/planned-items.repository";

import type {
  MonthlyBudgetPeriod,
  PlannedItem,
  PlannedItemDestination,
  PlannedItemDraft,
  PlannedItemMatch,
  PlannedItemOccurrence,
  PlannedItemOccurrenceDestination,
  PlannedItemWithDestinations,
} from "../types";

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

// ------------------------------------------------------------
// Row <-> camelCase mappers (rowToX() convention, same as
// src/features/dashboard/services/dashboard-network-config.service.ts).
// ------------------------------------------------------------

export function rowToPlannedItemDestination(row: PlannedItemDestinationRow): PlannedItemDestination {
  return {
    id: row.id,
    plannedItemId: row.planned_item_id,
    destinationAccountId: row.destination_account_id,
    amount: row.amount,
    percent: row.percent,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPlannedItem(row: PlannedItemRow): PlannedItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    direction: row.direction,
    amount: row.amount,
    sourceAccountId: row.source_account_id,
    categoryId: row.category_id,
    ownerMemberId: row.owner_member_id,
    isEstimate: row.is_estimate,
    allocationMode: row.allocation_mode,
    recurrenceType: row.recurrence_type,
    recurrenceMonths: row.recurrence_months,
    recurrenceIntervalMonths: row.recurrence_interval_months,
    oneTimeMonth: row.one_time_month,
    startMonth: row.start_month,
    endMonth: row.end_month,
    isActive: row.is_active,
    definitionVersion: row.definition_version,
    notes: row.notes,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPlannedItemWithDestinations(
  row: PlannedItemRowWithDestinations,
): PlannedItemWithDestinations {
  return {
    ...rowToPlannedItem(row),
    destinations: (row.planned_item_destinations ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(rowToPlannedItemDestination),
  };
}

export function rowToPlannedItemOccurrence(row: PlannedItemOccurrenceRow): PlannedItemOccurrence {
  return {
    id: row.id,
    plannedItemId: row.planned_item_id,
    householdId: row.household_id,
    month: row.month,
    status: row.status,
    expectedAmount: row.expected_amount,
    sourceAccountId: row.source_account_id,
    categoryId: row.category_id,
    isEstimate: row.is_estimate,
    sourceDefinitionVersion: row.source_definition_version,
    isOverridden: row.is_overridden,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPlannedItemOccurrenceDestination(
  row: PlannedItemOccurrenceDestinationRow,
): PlannedItemOccurrenceDestination {
  return {
    id: row.id,
    occurrenceId: row.occurrence_id,
    plannedItemDestinationId: row.planned_item_destination_id,
    destinationAccountId: row.destination_account_id,
    amount: row.amount,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPlannedItemMatch(row: PlannedItemMatchRow): PlannedItemMatch {
  return {
    id: row.id,
    occurrenceId: row.occurrence_id,
    transactionId: row.transaction_id,
    matchedBy: row.matched_by,
    matchedAt: row.matched_at,
  };
}

export function rowToMonthlyBudgetPeriod(row: MonthlyBudgetPeriodRow): MonthlyBudgetPeriod {
  return {
    id: row.id,
    householdId: row.household_id,
    month: row.month,
    status: row.status,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Translates the draft's tagged recurrence fields into the flat columns
 * `planned_items_recurrence_shape` expects (see
 * 20260901001700_planned_items_schema_fixes.sql) -- fail fast client-side
 * with a clear message, same approach as income-sources.service.ts /
 * recurring-expenses.service.ts's own `resolveRecurrenceColumns`. Unlike
 * those two, planned_items.recurrence_months is nullable, so "not
 * applicable" is sent as `null` here rather than `[]`.
 */
function resolveRecurrenceColumns(draft: PlannedItemDraft): Pick<
  PlannedItemInsert,
  "recurrence_type" | "recurrence_months" | "recurrence_interval_months" | "one_time_month"
> {
  const label = draft.name.trim() || "This planned item";

  if (draft.recurrenceType === "monthly") {
    return { recurrence_type: "monthly", recurrence_months: null, recurrence_interval_months: null, one_time_month: null };
  }

  if (draft.recurrenceType === "specific_months") {
    const months = [...new Set(draft.recurrenceMonths ?? [])]
      .map(Number)
      .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)
      .sort((a, b) => a - b);
    if (months.length === 0) {
      throw new Error(`"${label}" needs at least one month selected.`);
    }
    return { recurrence_type: "specific_months", recurrence_months: months, recurrence_interval_months: null, one_time_month: null };
  }

  if (draft.recurrenceType === "interval") {
    const interval = Number(draft.recurrenceIntervalMonths);
    if (!Number.isInteger(interval) || interval <= 0) {
      throw new Error(`"${label}" needs a positive whole number of months for its interval.`);
    }
    return { recurrence_type: "interval", recurrence_months: null, recurrence_interval_months: interval, one_time_month: null };
  }

  if (draft.recurrenceType === "one_time") {
    if (!draft.oneTimeMonth) {
      throw new Error(`"${label}" needs a month selected for its one-time occurrence.`);
    }
    return {
      recurrence_type: "one_time",
      recurrence_months: null,
      recurrence_interval_months: null,
      one_time_month: `${draft.oneTimeMonth.slice(0, 7)}-01`,
    };
  }

  // Exhaustiveness guard: the tagged union can arrive untyped from form
  // state, so this stays a real runtime check.
  throw new Error(`Unknown recurrence type: ${(draft as { recurrenceType: string }).recurrenceType}`);
}

/**
 * Client-side mirror of every rule the DB enforces on
 * planned_item_destinations (validate_planned_item_destination /
 * check_planned_item_destinations_deferred / the
 * planned_items_source_account_by_direction check) -- fails fast with a
 * readable message instead of surfacing a raw Postgres trigger exception.
 * The DB remains the source of truth; this is belt-and-braces, not a
 * replacement for it.
 */
function validateDraft(draft: PlannedItemDraft): void {
  const label = draft.name.trim() || "This planned item";

  if (!draft.name.trim()) throw new Error("Every planned item needs a name.");
  if (!draft.categoryId) throw new Error(`"${label}" needs a category.`);

  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`"${label}" needs a valid amount.`);

  if (draft.direction === "outflow" && !draft.sourceAccountId) {
    throw new Error(`"${label}" needs a source account.`);
  }

  const destinations = draft.destinations;

  if (draft.direction === "inflow" && destinations.length !== 1) {
    throw new Error(`"${label}" is income and needs exactly one destination account.`);
  }
  if (draft.allocationMode === "single" && destinations.length > 1) {
    throw new Error(`"${label}" uses single allocation mode and can have at most one destination account.`);
  }
  if (draft.isEstimate && destinations.length > 1) {
    throw new Error(`"${label}" is an estimate and can have at most one destination account.`);
  }

  const seenAccountIds = new Set<string>();
  for (const destination of destinations) {
    if (!destination.destinationAccountId) {
      throw new Error(`"${label}" has a destination with no account selected.`);
    }
    if (draft.direction === "outflow" && destination.destinationAccountId === draft.sourceAccountId) {
      throw new Error(`"${label}" cannot use the same account as both source and destination.`);
    }
    if (seenAccountIds.has(destination.destinationAccountId)) {
      throw new Error(`"${label}" cannot use the same destination account twice.`);
    }
    seenAccountIds.add(destination.destinationAccountId);
  }

  if (draft.allocationMode === "custom_amount") {
    if (destinations.length === 0) {
      throw new Error(`"${label}" needs at least one destination account for custom amounts.`);
    }
    let sum = 0;
    for (const destination of destinations) {
      const destinationAmount = Number(destination.amount);
      if (!Number.isFinite(destinationAmount) || destinationAmount <= 0) {
        throw new Error(`"${label}" needs a positive amount for every destination account.`);
      }
      sum = roundMoney(sum + destinationAmount);
    }
    if (Math.abs(sum - roundMoney(amount)) > 0.01) {
      throw new Error(`"${label}" destination amounts (${sum}) must add up to its total (${roundMoney(amount)}).`);
    }
  }

  if (draft.allocationMode === "custom_percent") {
    if (destinations.length === 0) {
      throw new Error(`"${label}" needs at least one destination account for custom percentages.`);
    }
    let sum = 0;
    for (const destination of destinations) {
      const destinationPercent = Number(destination.percent);
      if (!Number.isFinite(destinationPercent) || destinationPercent <= 0) {
        throw new Error(`"${label}" needs a positive percentage for every destination account.`);
      }
      sum = roundMoney(sum + destinationPercent);
    }
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(`"${label}" destination percentages (${sum}) must add up to 100.`);
    }
  }
}

/**
 * Only sends amount/percent for the mode that actually uses them --
 * validate_planned_item_destination rejects either being set for
 * single/equal_split, so this must never guess.
 */
function buildDestinationInserts(
  draft: PlannedItemDraft,
): Array<Omit<PlannedItemDestinationInsert, "planned_item_id">> {
  return draft.destinations.map((destination, index) => ({
    destination_account_id: destination.destinationAccountId,
    amount: draft.allocationMode === "custom_amount" ? roundMoney(Number(destination.amount)) : null,
    percent: draft.allocationMode === "custom_percent" ? roundMoney(Number(destination.percent)) : null,
    category_id: destination.categoryId ?? null,
    sort_order: index,
  }));
}

function toMonthColumn(value: string): string | null {
  return value ? `${value.slice(0, 7)}-01` : null;
}

class PlannedItemsService {
  async getPlannedItems(householdId: string): Promise<PlannedItemWithDestinations[]> {
    const { data, error } = await repositories.plannedItems.listForHousehold(householdId);
    if (error) throw error;
    return (data ?? []).map(rowToPlannedItemWithDestinations);
  }

  /** Every occurrence for this household, no month filter -- see listOccurrencesForHousehold's doc comment. Powers the forecast layer's "was this month already executed" check. */
  async getOccurrencesForHousehold(householdId: string): Promise<PlannedItemOccurrence[]> {
    const { data, error } = await repositories.plannedItems.listOccurrencesForHousehold(householdId);
    if (error) throw error;
    return (data ?? []).map(rowToPlannedItemOccurrence);
  }

  async createPlannedItem(
    draft: PlannedItemDraft,
    context: { householdId: string; createdBy: string },
  ): Promise<PlannedItemWithDestinations> {
    validateDraft(draft);
    const recurrenceColumns = resolveRecurrenceColumns(draft);

    const insertValues: PlannedItemInsert = {
      household_id: context.householdId,
      name: draft.name.trim(),
      direction: draft.direction,
      amount: roundMoney(Number(draft.amount)),
      source_account_id: draft.direction === "outflow" ? draft.sourceAccountId : null,
      category_id: draft.categoryId,
      owner_member_id: draft.ownerMemberId ?? null,
      is_estimate: draft.isEstimate,
      allocation_mode: draft.allocationMode,
      is_active: draft.isActive,
      notes: draft.notes.trim() || null,
      start_month: toMonthColumn(draft.startMonth),
      end_month: toMonthColumn(draft.endMonth),
      created_by: context.createdBy,
      ...recurrenceColumns,
    };

    const { data, error } = await repositories.plannedItems.createWithDestinations(
      insertValues,
      buildDestinationInserts(draft),
    );
    if (error) throw error;
    return rowToPlannedItemWithDestinations(data);
  }

  /** `destinations` is always replaced wholesale (delete-then-insert) -- there is no partial-edit path, matching how `saveConfiguration` treats a budget rule's allocations in monthly-budget.service.ts. */
  async updatePlannedItem(draft: PlannedItemDraft): Promise<PlannedItemWithDestinations> {
    validateDraft(draft);
    const recurrenceColumns = resolveRecurrenceColumns(draft);

    const updateValues: PlannedItemUpdate = {
      name: draft.name.trim(),
      direction: draft.direction,
      amount: roundMoney(Number(draft.amount)),
      source_account_id: draft.direction === "outflow" ? draft.sourceAccountId : null,
      category_id: draft.categoryId,
      owner_member_id: draft.ownerMemberId ?? null,
      is_estimate: draft.isEstimate,
      allocation_mode: draft.allocationMode,
      is_active: draft.isActive,
      notes: draft.notes.trim() || null,
      start_month: toMonthColumn(draft.startMonth),
      end_month: toMonthColumn(draft.endMonth),
      ...recurrenceColumns,
    };

    const { data, error } = await repositories.plannedItems.updateWithDestinations(
      draft.id,
      updateValues,
      buildDestinationInserts(draft),
    );
    if (error) throw error;
    return rowToPlannedItemWithDestinations(data);
  }

  /** Renamed from the old services' `setPaused` -- planned_items tracks `is_active` (not `is_paused`), so this takes "should it be active" rather than "should it be paused" to avoid a double-negative call site (`setActive(id, false)` reads the same either way, but `setPaused(id, false)` would mean "make it active", which is the confusing direction). */
  async setActive(id: string, isActive: boolean): Promise<PlannedItem> {
    const { data, error } = await repositories.plannedItems.setActive(id, isActive);
    if (error) throw error;
    return rowToPlannedItem(data);
  }

  async deletePlannedItem(id: string): Promise<PlannedItem> {
    const { data, error } = await repositories.plannedItems.softDelete(id);
    if (error) throw error;
    return rowToPlannedItem(data);
  }
}

export const plannedItemsService = new PlannedItemsService();
export { resolveRecurrenceColumns, validateDraft, buildDestinationInserts };
