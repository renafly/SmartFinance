import { isPlannedItemDueInMonth, splitEqualRemainderLast, splitPercentRemainderLast } from '@/features/planned-items/services/planned-items-resolver';
import { emptyPlannedItemDraft, generateDestinationDraftId, plannedItemToDraft, roundMoney } from '@/features/planned-items/utils';
import type { PlannedItemDestinationDraft, PlannedItemDraft, PlannedItemWithDestinations, ResolvedMonth } from '@/features/planned-items/types';

/**
 * Monthly Budget -- the simplified "Income -> Allocate -> Preview -> Save"
 * model. Pure, no I/O, no i18n.
 *
 * Two kinds of line, both stored as `planned_items` (no new tables):
 *   - income:   direction 'inflow', exactly one destination = the account
 *               the money lands in.
 *   - movement: direction 'outflow' from ONE source account to ONE OR MORE
 *               destination accounts, each with its own amount
 *               ("Investing: Account A -> XTB 300, Trading212 200, TR 100").
 *               Stored as one planned item: allocation_mode 'single' for
 *               one destination, 'custom_amount' for several, amount = the
 *               sum. This is the SAME multi-destination shape the resolver
 *               and confirm_planned_item_month already post as one real
 *               transfer (transfer_source + transfer_destination pair) per
 *               destination -- grouping is planning/UI only.
 *
 * Plain recurring expenses (outflow, zero destinations) are NOT part of
 * this screen -- they live on Category Budgets and are paid there.
 */

export type PlanRowKind = 'income' | 'movement';

export type PlanRow = {
  /** Stable React key. */
  key: string;
  kind: PlanRowKind;
  /**
   * income: one destination, amount in `draft.amount`.
   * movement: 1..N destinations, each amount in `destination.amount`
   * (draft.amount is recomputed as their sum when saving).
   */
  draft: PlannedItemDraft;
  /** planned_items.id this row was loaded from, null for a brand-new row. */
  sourceItemId: string | null;
  /** Editable-field fingerprint at load time -- see isRowDirty. */
  snapshot: string;
};

export type PlanAccount = {
  id: string;
  currentBalance: number;
};

let keyCounter = 0;
function nextKey(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

/** Accepts "1000", "1000.5", "1000,50", "1 000,50" -- returns NaN for anything else. */
export function parseAmount(value: string): number {
  const cleaned = (value ?? '').replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return Number.NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function positiveAmount(value: string): number {
  const amount = parseAmount(value);
  return Number.isFinite(amount) && amount > 0 ? roundMoney(amount) : 0;
}

/** Income: the account it lands in. Movement: its first destination. */
export function rowToAccountId(row: PlanRow): string {
  return row.draft.destinations[0]?.destinationAccountId ?? '';
}

export function rowFromAccountId(row: PlanRow): string {
  return row.kind === 'movement' ? row.draft.sourceAccountId : '';
}

/** One destination's amount inside a movement. */
export function destinationAmount(destination: PlannedItemDestinationDraft): number {
  return positiveAmount(destination.amount);
}

/** Income amount, or a movement's total across its destinations. */
export function rowAmount(row: PlanRow): number {
  if (row.kind === 'income') return positiveAmount(row.draft.amount);
  return roundMoney(row.draft.destinations.reduce((sum, destination) => sum + destinationAmount(destination), 0));
}

function fingerprint(kind: PlanRowKind, draft: PlannedItemDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    amount: kind === 'income' ? roundMoney(parseAmount(draft.amount) || 0) : null,
    source: draft.direction === 'outflow' ? draft.sourceAccountId : '',
    destinations: draft.destinations.map((destination) => [
      destination.destinationAccountId,
      kind === 'movement' ? roundMoney(parseAmount(destination.amount) || 0) : null,
    ]),
    categoryId: draft.categoryId,
    recurrenceType: draft.recurrenceType,
    recurrenceMonths: draft.recurrenceType === 'specific_months' ? [...draft.recurrenceMonths].sort((a, b) => a - b) : null,
    interval: draft.recurrenceType === 'interval' ? String(draft.recurrenceIntervalMonths) : null,
    oneTimeMonth: draft.recurrenceType === 'one_time' ? draft.oneTimeMonth.slice(0, 7) : null,
    startMonth: draft.startMonth.slice(0, 7),
    endMonth: draft.endMonth.slice(0, 7),
    isActive: draft.isActive,
    isEstimate: draft.isEstimate,
  });
}

export function isRowDirty(row: PlanRow): boolean {
  return row.sourceItemId === null || fingerprint(row.kind, row.draft) !== row.snapshot;
}

function makeRow(kind: PlanRowKind, draft: PlannedItemDraft, sourceItemId: string | null): PlanRow {
  return { key: nextKey(kind), kind, draft, sourceItemId, snapshot: fingerprint(kind, draft) };
}

/** Which of the two kinds a planned item is, or null when it doesn't belong on this screen (plain expenses). */
export function planKindOf(item: Pick<PlannedItemWithDestinations, 'direction' | 'destinations'>): PlanRowKind | null {
  if (item.direction === 'inflow') return 'income';
  if (item.direction === 'outflow' && item.destinations.length > 0) return 'movement';
  return null;
}

/** Per-destination amounts, in sort order -- the same maths the resolver uses when it posts. */
function destinationAmounts(item: PlannedItemWithDestinations): number[] {
  const sorted = [...item.destinations].sort((a, b) => a.sortOrder - b.sortOrder);
  switch (item.allocationMode) {
    case 'equal_split':
      return splitEqualRemainderLast(item.amount, sorted.length);
    case 'custom_amount':
      return sorted.map((destination) => roundMoney(destination.amount ?? 0));
    case 'custom_percent':
      return splitPercentRemainderLast(item.amount, sorted.map((destination) => Number(destination.percent ?? 0)));
    default:
      return sorted.map(() => roundMoney(item.amount));
  }
}

/**
 * Editable rows (incomes first, then movements) from the household's
 * planned items. A movement's destinations always come out with an
 * explicit per-destination amount -- older equal-split / percentage items
 * are shown with the exact amounts they'd post, and only get stored as
 * explicit amounts if you edit them (same totals, same transfers).
 */
export function rowsFromPlannedItems(items: PlannedItemWithDestinations[]): PlanRow[] {
  const incomes: PlanRow[] = [];
  const movements: PlanRow[] = [];

  for (const item of items) {
    if (item.deletedAt) continue;
    const kind = planKindOf(item);
    if (!kind) continue;
    const draft = plannedItemToDraft(item);

    if (kind === 'income') {
      draft.allocationMode = 'single';
      draft.destinations = draft.destinations.slice(0, 1).map((destination) => ({ ...destination, amount: '', percent: '' }));
      incomes.push(makeRow('income', draft, item.id));
      continue;
    }

    const sorted = [...item.destinations].sort((a, b) => a.sortOrder - b.sortOrder);
    const amounts = destinationAmounts(item);
    draft.destinations = sorted.map((destination, index) => ({
      id: destination.id,
      destinationAccountId: destination.destinationAccountId,
      amount: String(amounts[index] ?? 0),
      percent: '',
      categoryId: destination.categoryId,
    }));
    movements.push(makeRow('movement', draft, item.id));
  }

  return [...incomes, ...movements];
}

export function newIncomeRow(accountId: string, categoryId: string): PlanRow {
  const draft = emptyPlannedItemDraft('inflow', '', accountId);
  draft.categoryId = categoryId;
  return makeRow('income', draft, null);
}

export function newDestinationDraft(accountId = ''): PlannedItemDestinationDraft {
  return { id: generateDestinationDraftId(), destinationAccountId: accountId, amount: '', percent: '', categoryId: null };
}

export function newMovementRow(fromAccountId: string, categoryId: string): PlanRow {
  const draft = emptyPlannedItemDraft('outflow', fromAccountId, '');
  draft.categoryId = categoryId;
  draft.destinations = [newDestinationDraft()];
  return makeRow('movement', draft, null);
}

export function isRowDueInMonth(row: PlanRow, month: string): boolean {
  const draft = row.draft;
  return isPlannedItemDueInMonth(
    {
      isActive: draft.isActive,
      recurrenceType: draft.recurrenceType,
      recurrenceMonths: draft.recurrenceMonths,
      recurrenceIntervalMonths: draft.recurrenceIntervalMonths ? Number(draft.recurrenceIntervalMonths) : null,
      oneTimeMonth: draft.oneTimeMonth ? `${draft.oneTimeMonth.slice(0, 7)}-01` : null,
      startMonth: draft.startMonth ? `${draft.startMonth.slice(0, 7)}-01` : null,
      endMonth: draft.endMonth ? `${draft.endMonth.slice(0, 7)}-01` : null,
    },
    month,
  );
}

/** Row counts toward this month's plan (and gets posted on Save). */
export function rowCountsInMonth(row: PlanRow, month: string): boolean {
  return !row.draft.isEstimate && isRowDueInMonth(row, month);
}

export type PlanRowIssue =
  | 'missingName'
  | 'missingAccount'
  | 'missingDestination'
  | 'invalidAmount'
  | 'sameAccount'
  | 'duplicateDestination'
  | 'missingCategory'
  | 'invalidRecurrence';

export function validateRow(row: PlanRow): PlanRowIssue[] {
  const issues = new Set<PlanRowIssue>();
  const draft = row.draft;

  if (row.kind === 'income') {
    if (!rowToAccountId(row)) issues.add('missingAccount');
    if (rowAmount(row) <= 0) issues.add('invalidAmount');
  } else {
    if (!draft.name.trim()) issues.add('missingName');
    if (!draft.sourceAccountId) issues.add('missingAccount');
    if (draft.destinations.length === 0) issues.add('missingDestination');
    const seen = new Set<string>();
    for (const destination of draft.destinations) {
      if (!destination.destinationAccountId) issues.add('missingDestination');
      else {
        if (destination.destinationAccountId === draft.sourceAccountId) issues.add('sameAccount');
        if (seen.has(destination.destinationAccountId)) issues.add('duplicateDestination');
        seen.add(destination.destinationAccountId);
      }
      if (destinationAmount(destination) <= 0) issues.add('invalidAmount');
    }
  }

  if (!draft.categoryId) issues.add('missingCategory');
  if (draft.recurrenceType === 'specific_months' && draft.recurrenceMonths.length === 0) issues.add('invalidRecurrence');
  if (draft.recurrenceType === 'interval' && (!(Number(draft.recurrenceIntervalMonths) > 0) || !draft.startMonth)) issues.add('invalidRecurrence');
  if (draft.recurrenceType === 'one_time' && !draft.oneTimeMonth) issues.add('invalidRecurrence');
  return [...issues];
}

/**
 * The draft exactly as the planned-items service should persist it:
 * income -> single destination, amount as typed; movement -> 'single' for
 * one destination, 'custom_amount' for several, amount = the sum of the
 * destination amounts (the service/DB require those to match).
 */
export function toPersistableDraft(row: PlanRow, fallbackName: string): PlannedItemDraft {
  const draft = row.draft;
  const name = draft.name.trim() || fallbackName;
  if (row.kind === 'income') {
    return {
      ...draft,
      name,
      amount: String(rowAmount(row)),
      sourceAccountId: '',
      allocationMode: 'single',
      destinations: draft.destinations.slice(0, 1).map((destination) => ({ ...destination, amount: '', percent: '' })),
    };
  }
  const multiple = draft.destinations.length > 1;
  return {
    ...draft,
    name,
    amount: String(rowAmount(row)),
    allocationMode: multiple ? 'custom_amount' : 'single',
    destinations: draft.destinations.map((destination) => ({
      ...destination,
      amount: multiple ? String(destinationAmount(destination)) : '',
      percent: '',
    })),
  };
}

export type SavePlanEntry = { rowKey: string; draft: PlannedItemDraft };

export type SavePlan = {
  /** planned_items ids to soft-delete. */
  deletes: string[];
  updates: SavePlanEntry[];
  creates: SavePlanEntry[];
};

/** What persisting the edited rows means in planned_items terms. */
export function buildSavePlan(rows: PlanRow[], removed: PlanRow[], nameFor: (row: PlanRow) => string): SavePlan {
  const plan: SavePlan = { deletes: [], updates: [], creates: [] };
  for (const row of removed) {
    if (row.sourceItemId && !plan.deletes.includes(row.sourceItemId)) plan.deletes.push(row.sourceItemId);
  }
  for (const row of rows) {
    if (!row.sourceItemId) {
      plan.creates.push({ rowKey: row.key, draft: toPersistableDraft(row, nameFor(row)) });
    } else if (isRowDirty(row)) {
      plan.updates.push({ rowKey: row.key, draft: { ...toPersistableDraft(row, nameFor(row)), id: row.sourceItemId } });
    }
  }
  return plan;
}

// ------------------------------------------------------------
// Account impact -- the heart of the screen.
// ------------------------------------------------------------

export type PlanIncomeLine = { key: string; name: string; accountId: string; amount: number };
/** One real transfer: a movement with 3 destinations yields 3 of these. */
export type PlanMovementLine = { key: string; movementKey: string; name: string; fromAccountId: string; toAccountId: string; amount: number };

export type PlanIncomeAccountSummary = {
  accountId: string;
  income: number;
  movedOut: number;
  /** income - movedOut. Negative = moving out more than lands there this month. */
  remaining: number;
};

export type PlanAccountImpact = {
  accountId: string;
  /** Net change this month (+ money in, - money out). */
  change: number;
  /** Total arriving (income + incoming transfers). */
  incoming: number;
  /** Total leaving (outgoing transfers). */
  outgoing: number;
  isIncomeAccount: boolean;
  before: number;
  after: number;
};

export type MonthlyPlanSummary = {
  incomes: PlanIncomeLine[];
  /** Individual transfers (one per movement destination). */
  movements: PlanMovementLine[];
  totalIncome: number;
  totalMoved: number;
  /** totalIncome - totalMoved. */
  remaining: number;
  incomeAccounts: PlanIncomeAccountSummary[];
  impacts: PlanAccountImpact[];
  /** Income accounts that would end the month's plan below zero (remaining < 0). */
  overAllocatedAccountIds: string[];
};

/**
 * Pure account-impact maths for the rows that count in `month`: every
 * income lands in its account, every movement destination is its own
 * transfer out of the movement's source -- exactly the transactions Save
 * will post.
 */
export function summarizeMonthlyPlan(input: { rows: PlanRow[]; month: string; accounts: PlanAccount[] }): MonthlyPlanSummary {
  const incomes: PlanIncomeLine[] = [];
  const movements: PlanMovementLine[] = [];

  for (const row of input.rows) {
    if (!rowCountsInMonth(row, input.month)) continue;
    if (row.kind === 'income') {
      const amount = rowAmount(row);
      const accountId = rowToAccountId(row);
      if (amount > 0 && accountId) incomes.push({ key: row.key, name: row.draft.name.trim(), accountId, amount });
      continue;
    }
    const fromAccountId = row.draft.sourceAccountId;
    if (!fromAccountId) continue;
    row.draft.destinations.forEach((destination, index) => {
      const amount = destinationAmount(destination);
      const toAccountId = destination.destinationAccountId;
      if (amount <= 0 || !toAccountId || toAccountId === fromAccountId) return;
      movements.push({ key: `${row.key}-${index}`, movementKey: row.key, name: row.draft.name.trim(), fromAccountId, toAccountId, amount });
    });
  }

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const incomeByAccount = new Map<string, number>();
  const add = (map: Map<string, number>, id: string, amount: number) => map.set(id, roundMoney((map.get(id) ?? 0) + amount));

  for (const line of incomes) {
    add(incoming, line.accountId, line.amount);
    add(incomeByAccount, line.accountId, line.amount);
  }
  for (const line of movements) {
    add(outgoing, line.fromAccountId, line.amount);
    add(incoming, line.toAccountId, line.amount);
  }

  const totalIncome = roundMoney(incomes.reduce((sum, line) => sum + line.amount, 0));
  const totalMoved = roundMoney(movements.reduce((sum, line) => sum + line.amount, 0));

  const incomeAccounts: PlanIncomeAccountSummary[] = [...incomeByAccount.entries()].map(([accountId, income]) => {
    const movedOut = outgoing.get(accountId) ?? 0;
    return { accountId, income, movedOut, remaining: roundMoney(income - movedOut) };
  });

  const balanceById = new Map(input.accounts.map((account) => [account.id, Number(account.currentBalance) || 0]));
  const touched = new Set<string>([...incoming.keys(), ...outgoing.keys()]);
  // Income accounts first (in entry order), then destinations in the order they appear.
  const order: string[] = [];
  for (const line of incomes) if (!order.includes(line.accountId)) order.push(line.accountId);
  for (const line of movements) if (!order.includes(line.toAccountId)) order.push(line.toAccountId);
  for (const id of touched) if (!order.includes(id)) order.push(id);

  const impacts: PlanAccountImpact[] = order.map((accountId) => {
    const inAmount = incoming.get(accountId) ?? 0;
    const outAmount = outgoing.get(accountId) ?? 0;
    const change = roundMoney(inAmount - outAmount);
    const before = roundMoney(balanceById.get(accountId) ?? 0);
    return { accountId, change, incoming: inAmount, outgoing: outAmount, isIncomeAccount: incomeByAccount.has(accountId), before, after: roundMoney(before + change) };
  });

  return {
    incomes,
    movements,
    totalIncome,
    totalMoved,
    remaining: roundMoney(totalIncome - totalMoved),
    incomeAccounts,
    impacts,
    overAllocatedAccountIds: incomeAccounts.filter((entry) => entry.remaining < -0.004).map((entry) => entry.accountId),
  };
}

/**
 * Read-only rows describing what a saved (committed) month actually
 * posted -- built from the month's confirmed occurrences rather than the
 * templates, since templates may have been edited since. One movement row
 * per occurrence, with all its destinations -- same grouping as editing.
 */
export function rowsFromPostedMonth(resolved: ResolvedMonth, itemNameById: Map<string, string>): PlanRow[] {
  const incomes: PlanRow[] = [];
  const movements: PlanRow[] = [];
  for (const entry of resolved.occurrences) {
    const occurrence = entry.occurrence;
    if (occurrence.status !== 'confirmed') continue;
    const name = itemNameById.get(occurrence.plannedItemId) ?? '';
    if (occurrence.sourceAccountId === null) {
      const row = newIncomeRow(entry.destinations[0]?.destinationAccountId ?? '', occurrence.categoryId);
      row.draft.name = name;
      row.draft.amount = String(entry.destinations[0]?.amount ?? occurrence.expectedAmount);
      incomes.push(row);
      continue;
    }
    if (entry.destinations.length === 0) continue; // plain expense -- not part of this screen
    const row = newMovementRow(occurrence.sourceAccountId, occurrence.categoryId);
    row.draft.name = name;
    row.draft.destinations = entry.destinations.map((destination) => ({ ...newDestinationDraft(destination.destinationAccountId), amount: String(destination.amount) }));
    movements.push(row);
  }
  return [...incomes, ...movements];
}
