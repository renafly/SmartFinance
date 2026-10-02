import {
  buildSavePlan,
  isRowDirty,
  newDestinationDraft,
  newIncomeRow,
  newMovementRow,
  parseAmount,
  rowAmount,
  rowsFromPlannedItems,
  summarizeMonthlyPlan,
  toPersistableDraft,
  validateRow,
  type PlanRow,
} from './monthly-plan';
import type { PlannedItemDestination, PlannedItemWithDestinations } from '@/features/planned-items/types';

const MONTH = '2026-09';

function destination(overrides: Partial<PlannedItemDestination> = {}): PlannedItemDestination {
  return {
    id: `dest-${Math.random().toString(36).slice(2, 8)}`,
    plannedItemId: 'item-1',
    destinationAccountId: 'acct-dest',
    amount: null,
    percent: null,
    categoryId: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function item(overrides: Partial<PlannedItemWithDestinations> = {}): PlannedItemWithDestinations {
  return {
    id: 'item-1',
    householdId: 'household-1',
    name: 'Item',
    direction: 'outflow',
    amount: 100,
    sourceAccountId: 'acct-main',
    categoryId: 'cat-1',
    ownerMemberId: null,
    isEstimate: false,
    allocationMode: 'single',
    recurrenceType: 'monthly',
    recurrenceMonths: null,
    recurrenceIntervalMonths: null,
    oneTimeMonth: null,
    startMonth: null,
    endMonth: null,
    isActive: true,
    definitionVersion: 1,
    notes: null,
    deletedAt: null,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    destinations: [],
    ...overrides,
  };
}

function income(amount: number, accountId = 'acct-main'): PlanRow {
  const row = newIncomeRow(accountId, 'cat-income');
  row.draft.amount = String(amount);
  return row;
}

/** A movement: one source, one or more [destination, amount] pairs. */
function movement(name: string, destinations: Array<[string, number]>, fromAccountId = 'acct-main'): PlanRow {
  const row = newMovementRow(fromAccountId, 'cat-transfer');
  row.draft.name = name;
  row.draft.destinations = destinations.map(([accountId, amount]) => ({ ...newDestinationDraft(accountId), amount: String(amount) }));
  return row;
}

describe('monthly plan', () => {
  it('matches the brief: 5000 income, grouped and single movements, 3000 left in the income account', () => {
    const rows = [
      income(5000),
      movement('Investing', [['acct-xtb', 300], ['acct-t212', 200], ['acct-tr', 100]]),
      movement('Savings', [['acct-savings', 1000]]),
      movement('Holiday', [['acct-holiday', 400]]),
    ];
    const summary = summarizeMonthlyPlan({ rows, month: MONTH, accounts: [] });

    expect(rowAmount(rows[1])).toBe(600);
    expect(summary.totalIncome).toBe(5000);
    expect(summary.totalMoved).toBe(2000);
    expect(summary.remaining).toBe(3000);
    // One real transfer per destination.
    expect(summary.movements.map((line) => [line.fromAccountId, line.toAccountId, line.amount])).toEqual([
      ['acct-main', 'acct-xtb', 300],
      ['acct-main', 'acct-t212', 200],
      ['acct-main', 'acct-tr', 100],
      ['acct-main', 'acct-savings', 1000],
      ['acct-main', 'acct-holiday', 400],
    ]);
    expect(summary.incomeAccounts).toEqual([{ accountId: 'acct-main', income: 5000, movedOut: 2000, remaining: 3000 }]);
    expect(summary.impacts[0]).toMatchObject({ accountId: 'acct-main', incoming: 5000, outgoing: 2000, change: 3000, isIncomeAccount: true });
  });

  it('uses real balances for before/after and flags an over-allocated income account', () => {
    const rows = [income(1000), movement('Savings', [['acct-savings', 1500]])];
    const summary = summarizeMonthlyPlan({
      rows,
      month: MONTH,
      accounts: [{ id: 'acct-main', currentBalance: 200 }, { id: 'acct-savings', currentBalance: 50 }],
    });
    expect(summary.impacts.find((impact) => impact.accountId === 'acct-main')).toMatchObject({ before: 200, change: -500, after: -300 });
    expect(summary.impacts.find((impact) => impact.accountId === 'acct-savings')).toMatchObject({ before: 50, after: 1550 });
    expect(summary.overAllocatedAccountIds).toEqual(['acct-main']);
  });

  it('skips movements not due this month and estimates', () => {
    const notThisMonth = movement('Xmas', [['acct-savings', 100]]);
    notThisMonth.draft.recurrenceType = 'specific_months';
    notThisMonth.draft.recurrenceMonths = [12];
    const estimate = movement('Maybe', [['acct-holiday', 50]]);
    estimate.draft.isEstimate = true;
    const summary = summarizeMonthlyPlan({ rows: [income(1000), notThisMonth, estimate], month: MONTH, accounts: [] });
    expect(summary.totalMoved).toBe(0);
    expect(summary.remaining).toBe(1000);
  });

  it('parses comma decimals', () => {
    expect(parseAmount('1000,50')).toBe(1000.5);
    expect(parseAmount('1 000.25')).toBe(1000.25);
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
  });

  it('validates rows', () => {
    expect(validateRow(movement('Loop', [['acct-main', 100]]))).toContain('sameAccount');
    expect(validateRow(movement('Zero', [['acct-savings', 0]]))).toContain('invalidAmount');
    expect(validateRow(movement('Twice', [['acct-a', 10], ['acct-a', 20]]))).toContain('duplicateDestination');
    expect(validateRow(movement('', [['acct-a', 10]]))).toContain('missingName');
    expect(validateRow(movement('Empty', []))).toContain('missingDestination');
    expect(validateRow(income(100, ''))).toContain('missingAccount');
    expect(validateRow(movement('Investing', [['acct-a', 10], ['acct-b', 20]]))).toEqual([]);
  });

  it('persists a grouped movement as ONE custom_amount item whose amount is the sum, and a single one as single', () => {
    const grouped = toPersistableDraft(movement('Investing', [['acct-xtb', 300], ['acct-t212', 200], ['acct-tr', 100]]), 'x');
    expect(grouped.allocationMode).toBe('custom_amount');
    expect(grouped.amount).toBe('600');
    expect(grouped.destinations.map((destination) => [destination.destinationAccountId, destination.amount])).toEqual([
      ['acct-xtb', '300'],
      ['acct-t212', '200'],
      ['acct-tr', '100'],
    ]);

    const single = toPersistableDraft(movement('Savings', [['acct-savings', 1000]]), 'x');
    expect(single.allocationMode).toBe('single');
    expect(single.amount).toBe('1000');
    expect(single.destinations[0].amount).toBe('');
  });

  it('loads each movement item as one row (older percentage splits shown with their real amounts) and skips plain expenses', () => {
    const rows = rowsFromPlannedItems([
      item({ id: 'salary', direction: 'inflow', sourceAccountId: null, amount: 5000, destinations: [destination({ destinationAccountId: 'acct-main' })] }),
      item({ id: 'rent', amount: 900 }),
      item({ id: 'savings', amount: 1000, destinations: [destination({ destinationAccountId: 'acct-savings' })] }),
      item({
        id: 'split',
        amount: 1000,
        allocationMode: 'custom_percent',
        destinations: [
          destination({ destinationAccountId: 'acct-a', percent: 70, sortOrder: 0 }),
          destination({ destinationAccountId: 'acct-b', percent: 30, sortOrder: 1 }),
        ],
      }),
    ]);
    expect(rows.map((row) => [row.kind, row.sourceItemId, rowAmount(row)])).toEqual([
      ['income', 'salary', 5000],
      ['movement', 'savings', 1000],
      ['movement', 'split', 1000],
    ]);
    expect(rows[2].draft.destinations.map((destination) => [destination.destinationAccountId, destination.amount])).toEqual([
      ['acct-a', '700'],
      ['acct-b', '300'],
    ]);
    expect(rows.every((row) => !isRowDirty(row))).toBe(true);
  });

  it('builds a save plan: untouched rows are left alone, edits update, removed rows are deleted', () => {
    const rows = rowsFromPlannedItems([
      item({ id: 'salary', direction: 'inflow', sourceAccountId: null, amount: 5000, destinations: [destination({ destinationAccountId: 'acct-main' })] }),
      item({ id: 'savings', amount: 1000, destinations: [destination({ destinationAccountId: 'acct-savings' })] }),
    ]);
    expect(buildSavePlan(rows, [], () => 'x')).toEqual({ deletes: [], updates: [], creates: [] });

    rows[0].draft.amount = '5200';
    const plan = buildSavePlan([rows[0], income(300)], [rows[1]], () => 'Default');
    expect(plan.deletes).toEqual(['savings']);
    expect(plan.updates.map(({ draft }) => [draft.id, draft.amount])).toEqual([['salary', '5200']]);
    expect(plan.creates.map(({ draft }) => [draft.amount, draft.name])).toEqual([['300', 'Default']]);
  });
});
