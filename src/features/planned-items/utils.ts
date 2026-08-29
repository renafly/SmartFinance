import {
  formatRecurrenceSummary as formatRecurrenceSummaryShared,
  type RecurrenceLike,
} from '@/features/shared/recurrence';

import type {
  PlannedItem,
  PlannedItemAllocationMode,
  PlannedItemDestination,
  PlannedItemDestinationDraft,
  PlannedItemDraft,
  PlannedItemWithDestinations,
} from './types';

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? Number(value) : 0) * 100) / 100;
}

function generateTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateDestinationDraftId() {
  return generateTempId('planned-item-dest');
}

/**
 * Minimal shape `formatPlannedItemRecurrenceSummary` needs to reuse the
 * shared, purely-textual recurrence formatter (`@/features/shared/recurrence`)
 * -- deliberately NOT used for "is this due in month X" (see the resolver's
 * own `isPlannedItemDueInMonth`, which stays unreused for good, documented
 * reasons: planned_items.start_month/end_month are optional independent
 * bounds, unlike the shared predicate's mandatory start_date). Formatting a
 * recurrence into a short string never reads start/end at all, so reuse is
 * safe here even though it isn't for the due-in-month question -- "due this
 * month" in this feature's UI is instead read directly off the resolved
 * month's occurrences (whether a plannedItemId has one), never
 * recomputed client-side.
 */
export type PlannedItemRecurrenceLike = {
  recurrenceType: PlannedItem['recurrenceType'];
  recurrenceMonths: number[] | readonly number[] | null;
  /** Accepts both the persisted numeric form (PlannedItem) and the still-being-typed string form (PlannedItemDraft) -- this helper is purely textual formatting, called from both a saved item's collapsed row and a draft still open for editing. */
  recurrenceIntervalMonths: number | string | null;
  oneTimeMonth: string | null;
  isActive: boolean;
};

function toRecurrenceLike(item: PlannedItemRecurrenceLike): RecurrenceLike {
  return {
    recurrence_type: item.recurrenceType,
    recurrence_months: item.recurrenceMonths,
    recurrence_interval_months: item.recurrenceIntervalMonths != null ? Number(item.recurrenceIntervalMonths) : null,
    one_time_month: item.oneTimeMonth,
    start_date: '1970-01-01',
    end_date: null,
    is_paused: !item.isActive,
  };
}

export function formatPlannedItemRecurrenceSummary(item: PlannedItemRecurrenceLike): string {
  return formatRecurrenceSummaryShared(toRecurrenceLike(item));
}

// ------------------------------------------------------------
// Draft <-> row-ish mapping (form state uses string-valued amount/percent
// fields, same convention as PlannedItemDraft's own doc comments).
// ------------------------------------------------------------

export function destinationToDraft(destination: PlannedItemDestination): PlannedItemDestinationDraft {
  return {
    id: destination.id,
    destinationAccountId: destination.destinationAccountId,
    amount: destination.amount != null ? String(destination.amount) : '',
    percent: destination.percent != null ? String(destination.percent) : '',
    categoryId: destination.categoryId,
  };
}

export function plannedItemToDraft(item: PlannedItemWithDestinations): PlannedItemDraft {
  return {
    id: item.id,
    name: item.name,
    direction: item.direction,
    amount: String(item.amount),
    sourceAccountId: item.sourceAccountId ?? '',
    categoryId: item.categoryId,
    ownerMemberId: item.ownerMemberId,
    isEstimate: item.isEstimate,
    allocationMode: item.allocationMode,
    destinations: item.destinations.map(destinationToDraft),
    recurrenceType: item.recurrenceType,
    recurrenceMonths: item.recurrenceMonths ?? [],
    recurrenceIntervalMonths: item.recurrenceIntervalMonths != null ? String(item.recurrenceIntervalMonths) : '2',
    oneTimeMonth: item.oneTimeMonth ? item.oneTimeMonth.slice(0, 7) : new Date().toISOString().slice(0, 7),
    startMonth: item.startMonth ? item.startMonth.slice(0, 7) : '',
    endMonth: item.endMonth ? item.endMonth.slice(0, 7) : '',
    isActive: item.isActive,
    notes: item.notes ?? '',
  };
}

export function emptyPlannedItemDraft(
  direction: PlannedItemDraft['direction'],
  sourceAccountId: string,
  destinationAccountId: string,
): PlannedItemDraft {
  return {
    id: generateTempId('planned-item'),
    name: '',
    direction,
    amount: '',
    sourceAccountId: direction === 'outflow' ? sourceAccountId : '',
    categoryId: '',
    ownerMemberId: null,
    isEstimate: false,
    allocationMode: 'single',
    destinations: destinationAccountId
      ? [{ id: generateDestinationDraftId(), destinationAccountId, amount: '', percent: '', categoryId: null }]
      : [],
    recurrenceType: 'monthly',
    recurrenceMonths: [],
    recurrenceIntervalMonths: '2',
    oneTimeMonth: new Date().toISOString().slice(0, 7),
    startMonth: '',
    endMonth: '',
    isActive: true,
    notes: '',
  };
}

// ------------------------------------------------------------
// Allocation-mode UX helper.
//
// Design call (see the planned-item-destinations-editor doc comment for the
// full rationale): 'single' is never a mode the user picks from a list --
// it is simply what a 0- or 1-destination item's mode collapses to. The
// mode selector (equal_split / custom_amount / custom_percent) only ever
// renders once there are 2+ destinations, and this function is the one
// place that decides which mode is actually "in effect" for a given
// destination count -- every allocation computation in the editor and the
// card goes through it rather than reading draft.allocationMode raw.
// ------------------------------------------------------------
export function effectiveAllocationMode(
  destinationCount: number,
  requestedMode: PlannedItemAllocationMode,
): PlannedItemAllocationMode {
  if (destinationCount <= 1) return 'single';
  // Coming from 'single' (the only way to reach 2 destinations from a
  // fresh/simple item) with no explicit choice yet -- default to the
  // gentlest option, equal split, rather than leaving amounts unassigned.
  return requestedMode === 'single' ? 'equal_split' : requestedMode;
}

/** Equal-split preview amounts -- remainder (from truncating division) goes to the *last* row by sort order, mirroring the resolver's own distributeEqualSplit (services/planned-items-resolver.ts) so the on-screen preview always matches what confirming the month will actually compute. */
export function distributeEqualSplitPreview(totalAmount: number, count: number): number[] {
  if (count <= 0) return [];
  const total = roundMoney(totalAmount);
  const cents = Math.round(total * 100);
  const baseShareCents = Math.floor(cents / count);
  const shares = new Array(count).fill(baseShareCents);
  shares[count - 1] += cents - baseShareCents * count;
  return shares.map((cents) => cents / 100);
}

export function sumDestinationAmounts(destinations: PlannedItemDestinationDraft[]): number {
  return roundMoney(destinations.reduce((sum, destination) => sum + (Number(destination.amount) || 0), 0));
}

export function sumDestinationPercents(destinations: PlannedItemDestinationDraft[]): number {
  return roundMoney(destinations.reduce((sum, destination) => sum + (Number(destination.percent) || 0), 0));
}
