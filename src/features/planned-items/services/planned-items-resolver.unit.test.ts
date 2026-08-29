import {
  isPlannedItemDueInMonth,
  resolvePlannedMonth,
  splitEqualRemainderLast,
  splitPercentRemainderLast,
} from "./planned-items-resolver";
import type {
  PlannedItemAccountLike,
  PlannedItemDestination,
  PlannedItemOccurrence,
  PlannedItemOccurrenceDestination,
  PlannedItemWithDestinations,
} from "../types";

const HOUSEHOLD_ID = "household-1";
const MONTH = "2026-09";

function account(id: string, type: PlannedItemAccountLike["type"] = "bank"): PlannedItemAccountLike {
  return { id, type };
}

function destination(overrides: Partial<PlannedItemDestination> = {}): PlannedItemDestination {
  return {
    id: `dest-${Math.random().toString(36).slice(2, 8)}`,
    plannedItemId: "item-1",
    destinationAccountId: "acct-dest",
    amount: null,
    percent: null,
    categoryId: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function plannedItem(overrides: Partial<PlannedItemWithDestinations> = {}): PlannedItemWithDestinations {
  return {
    id: "item-1",
    householdId: HOUSEHOLD_ID,
    name: "Rent",
    direction: "outflow",
    amount: 1000,
    sourceAccountId: "acct-source",
    categoryId: "category-1",
    ownerMemberId: null,
    isEstimate: false,
    allocationMode: "single",
    recurrenceType: "monthly",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    destinations: [],
    ...overrides,
  };
}

function occurrence(overrides: Partial<PlannedItemOccurrence> = {}): PlannedItemOccurrence {
  return {
    id: "occ-1",
    plannedItemId: "item-1",
    householdId: HOUSEHOLD_ID,
    month: "2026-09-01",
    status: "planned",
    expectedAmount: 1000,
    sourceAccountId: "acct-source",
    categoryId: "category-1",
    isEstimate: false,
    sourceDefinitionVersion: 1,
    isOverridden: false,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function occurrenceDestination(
  overrides: Partial<PlannedItemOccurrenceDestination> = {},
): PlannedItemOccurrenceDestination {
  return {
    id: `occdest-${Math.random().toString(36).slice(2, 8)}`,
    occurrenceId: "occ-1",
    plannedItemDestinationId: null,
    destinationAccountId: "acct-dest",
    amount: 1000,
    categoryId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const ACCOUNTS: PlannedItemAccountLike[] = [
  account("acct-source"),
  account("acct-dest"),
  account("acct-dest-2"),
  account("acct-dest-3"),
  account("acct-savings", "savings"),
  account("acct-investment", "investment"),
];

function resolve(overrides: {
  plannedItems: PlannedItemWithDestinations[];
  existingOccurrences?: PlannedItemOccurrence[];
  existingOccurrenceDestinations?: PlannedItemOccurrenceDestination[];
  accounts?: PlannedItemAccountLike[];
  month?: string;
}) {
  return resolvePlannedMonth({
    householdId: HOUSEHOLD_ID,
    month: overrides.month ?? MONTH,
    plannedItems: overrides.plannedItems,
    existingOccurrences: overrides.existingOccurrences ?? [],
    existingOccurrenceDestinations: overrides.existingOccurrenceDestinations ?? [],
    accounts: overrides.accounts ?? ACCOUNTS,
  });
}

describe("splitEqualRemainderLast", () => {
  it("divides evenly with no remainder", () => {
    expect(splitEqualRemainderLast(300, 3)).toEqual([100, 100, 100]);
  });

  it("hands the whole remainder to the last share (500 / 3)", () => {
    const shares = splitEqualRemainderLast(500, 3);
    expect(shares).toEqual([166.66, 166.66, 166.68]);
    expect(shares.reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(500, 2);
  });
});

describe("splitPercentRemainderLast", () => {
  it("truncates each share to the cent and hands the remainder to the last entry", () => {
    // 100 / 3 -> 33.33 repeating per third; truncation loses 1 cent total.
    const shares = splitPercentRemainderLast(100, [100 / 3, 100 / 3, 100 / 3]);
    expect(shares).toEqual([33.33, 33.33, 33.34]);
    expect(shares.reduce((sum, amount) => sum + amount, 0)).toBe(100);
  });
});

describe("isPlannedItemDueInMonth", () => {
  it("matches a one-time item only in its configured month, ignoring start/end bounds", () => {
    const item = plannedItem({ recurrenceType: "one_time", oneTimeMonth: "2026-12-01" });
    expect(isPlannedItemDueInMonth(item, "2026-12")).toBe(true);
    expect(isPlannedItemDueInMonth(item, "2026-11")).toBe(false);
  });

  it("matches specific_months only on the listed calendar months", () => {
    const item = plannedItem({ recurrenceType: "specific_months", recurrenceMonths: [3, 6, 9, 12] });
    expect(isPlannedItemDueInMonth(item, "2026-09")).toBe(true);
    expect(isPlannedItemDueInMonth(item, "2026-08")).toBe(false);
  });

  it("respects start/end month bounds for a monthly item", () => {
    const item = plannedItem({ recurrenceType: "monthly", startMonth: "2026-06-01", endMonth: "2026-08-31" });
    expect(isPlannedItemDueInMonth(item, "2026-05")).toBe(false);
    expect(isPlannedItemDueInMonth(item, "2026-06")).toBe(true);
    expect(isPlannedItemDueInMonth(item, "2026-08")).toBe(true);
    expect(isPlannedItemDueInMonth(item, "2026-09")).toBe(false);
  });

  it("is false when inactive regardless of recurrence", () => {
    const item = plannedItem({ recurrenceType: "monthly", isActive: false });
    expect(isPlannedItemDueInMonth(item, "2026-09")).toBe(false);
  });
});

describe("resolvePlannedMonth", () => {
  it("resolves a 0-destination outflow item into a single plain_expense leg with zero occurrence destinations", () => {
    const item = plannedItem({ allocationMode: "single", destinations: [] });
    const result = resolve({ plannedItems: [item] });

    expect(result.occurrences).toHaveLength(1);
    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(true);
    expect(resolved.action).toBe("create");
    // Plain expense -- zero occurrence_destination rows. The transaction
    // leg is generated directly from the occurrence's own source account
    // (see occurrenceDestinationLookupAccountId: null below).
    expect(resolved.destinations).toEqual([]);
    expect(resolved.transactionLegs).toEqual([
      {
        role: "plain_expense",
        accountId: "acct-source",
        amount: 1000,
        categoryId: "category-1",
        transferGroupId: null,
        occurrenceDestinationLookupAccountId: null,
      },
    ]);
    expect(result.summary.plannedExpenses).toBe(1000);
    expect(result.summary.available).toBe(-1000);
  });

  it("resolves a 1-destination outflow item into a transfer_source/transfer_destination pair sharing one occurrence_destination row", () => {
    const item = plannedItem({
      allocationMode: "single",
      destinations: [destination({ id: "tmpl-1", destinationAccountId: "acct-dest" })],
    });
    const result = resolve({ plannedItems: [item] });

    const [resolved] = result.occurrences;
    expect(resolved.destinations).toEqual([
      { id: null, plannedItemDestinationId: "tmpl-1", destinationAccountId: "acct-dest", amount: 1000, categoryId: "category-1" },
    ]);
    expect(resolved.transactionLegs).toEqual([
      {
        role: "transfer_source",
        accountId: "acct-source",
        amount: 1000,
        categoryId: "category-1",
        transferGroupId: null,
        occurrenceDestinationLookupAccountId: "acct-dest",
      },
      {
        role: "transfer_destination",
        accountId: "acct-dest",
        amount: 1000,
        categoryId: "category-1",
        transferGroupId: null,
        occurrenceDestinationLookupAccountId: "acct-dest",
      },
    ]);
  });

  it("resolves an N-destination equal_split outflow item into N independent transfer pairs, remainder cents to the last destination (500 / 3)", () => {
    const item = plannedItem({
      amount: 500,
      allocationMode: "equal_split",
      destinations: [
        destination({ id: "tmpl-1", destinationAccountId: "acct-dest", sortOrder: 0 }),
        destination({ id: "tmpl-2", destinationAccountId: "acct-dest-2", sortOrder: 1 }),
        destination({ id: "tmpl-3", destinationAccountId: "acct-dest-3", sortOrder: 2 }),
      ],
    });
    const result = resolve({ plannedItems: [item] });

    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(true);
    expect(resolved.destinations.map((d) => d.amount)).toEqual([166.66, 166.66, 166.68]);
    expect(resolved.transactionLegs).toHaveLength(6);
    const transferDestinationLegs = resolved.transactionLegs.filter((leg) => leg.role === "transfer_destination");
    expect(transferDestinationLegs).toHaveLength(3);
    // Each pair is independently keyed by its own destination account.
    expect(new Set(transferDestinationLegs.map((leg) => leg.occurrenceDestinationLookupAccountId)).size).toBe(3);
    const total = resolved.destinations.reduce((sum, d) => sum + d.amount, 0);
    expect(total).toBeCloseTo(500, 2);
  });

  it("resolves custom_amount destinations by copying the template amounts directly", () => {
    const item = plannedItem({
      amount: 300,
      allocationMode: "custom_amount",
      destinations: [
        destination({ id: "tmpl-1", destinationAccountId: "acct-dest", amount: 200, sortOrder: 0 }),
        destination({ id: "tmpl-2", destinationAccountId: "acct-dest-2", amount: 100, sortOrder: 1 }),
      ],
    });
    const result = resolve({ plannedItems: [item] });

    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(true);
    expect(resolved.destinations.map((d) => d.amount)).toEqual([200, 100]);
  });

  it("resolves custom_percent destinations with truncation, remainder cents to the last destination by sort_order", () => {
    const item = plannedItem({
      amount: 100,
      allocationMode: "custom_percent",
      destinations: [
        destination({ id: "tmpl-1", destinationAccountId: "acct-dest", percent: 100 / 3, sortOrder: 0 }),
        destination({ id: "tmpl-2", destinationAccountId: "acct-dest-2", percent: 100 / 3, sortOrder: 1 }),
        destination({ id: "tmpl-3", destinationAccountId: "acct-dest-3", percent: 100 / 3, sortOrder: 2 }),
      ],
    });
    const result = resolve({ plannedItems: [item] });

    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(true);
    expect(resolved.destinations.map((d) => d.amount)).toEqual([33.33, 33.33, 33.34]);
  });

  it("resolves an inflow item into a single income leg on its one destination account", () => {
    const item = plannedItem({
      direction: "inflow",
      sourceAccountId: null,
      allocationMode: "single",
      destinations: [destination({ id: "tmpl-1", destinationAccountId: "acct-dest" })],
    });
    const result = resolve({ plannedItems: [item] });

    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(true);
    expect(resolved.transactionLegs).toEqual([
      {
        role: "income",
        accountId: "acct-dest",
        amount: 1000,
        categoryId: "category-1",
        transferGroupId: null,
        occurrenceDestinationLookupAccountId: "acct-dest",
      },
    ]);
    expect(result.summary.income).toBe(1000);
    expect(result.summary.available).toBe(1000);
  });

  it("produces no occurrence for a one-time item outside its configured month", () => {
    const item = plannedItem({ recurrenceType: "one_time", oneTimeMonth: "2026-12-01" });
    const result = resolve({ plannedItems: [item], month: "2026-09" });
    expect(result.occurrences).toHaveLength(0);
  });

  it("produces an occurrence for a one-time item in its configured month", () => {
    const item = plannedItem({ recurrenceType: "one_time", oneTimeMonth: "2026-09-01" });
    const result = resolve({ plannedItems: [item], month: "2026-09" });
    expect(result.occurrences).toHaveLength(1);
  });

  it("produces an occurrence for a specific_months item only in a listed month", () => {
    const item = plannedItem({ recurrenceType: "specific_months", recurrenceMonths: [1, 6, 12] });
    expect(resolve({ plannedItems: [item], month: "2026-06" }).occurrences).toHaveLength(1);
    expect(resolve({ plannedItems: [item], month: "2026-07" }).occurrences).toHaveLength(0);
  });

  it("produces no occurrence when the item is outside its start/end month window this month", () => {
    const item = plannedItem({ recurrenceType: "monthly", startMonth: "2027-01-01" });
    const result = resolve({ plannedItems: [item], month: "2026-09" });
    expect(result.occurrences).toHaveLength(0);
  });

  it("leaves an already-overridden occurrence untouched even though the definition_version is newer", () => {
    const item = plannedItem({ definitionVersion: 5, amount: 2000 });
    const existing = occurrence({
      sourceDefinitionVersion: 1,
      isOverridden: true,
      expectedAmount: 1234,
      status: "planned",
    });
    const existingDest = occurrenceDestination({ occurrenceId: existing.id, amount: 1234 });

    const result = resolve({
      plannedItems: [item],
      existingOccurrences: [existing],
      existingOccurrenceDestinations: [existingDest],
    });

    const [resolved] = result.occurrences;
    expect(resolved.action).toBe("unchanged");
    expect(resolved.occurrence.expectedAmount).toBe(1234);
    expect(resolved.occurrence.sourceDefinitionVersion).toBe(1);
  });

  it("refreshes a stale, non-overridden 'planned' occurrence to the current definition", () => {
    const item = plannedItem({ definitionVersion: 2, amount: 1500 });
    const existing = occurrence({ sourceDefinitionVersion: 1, isOverridden: false, expectedAmount: 1000 });

    const result = resolve({ plannedItems: [item], existingOccurrences: [existing] });

    const [resolved] = result.occurrences;
    expect(resolved.action).toBe("refresh");
    expect(resolved.occurrence.id).toBe(existing.id);
    expect(resolved.occurrence.expectedAmount).toBe(1500);
    expect(resolved.occurrence.sourceDefinitionVersion).toBe(2);
  });

  it("leaves a confirmed occurrence untouched even when the definition has changed since", () => {
    const item = plannedItem({ definitionVersion: 2, amount: 1500 });
    const existing = occurrence({ sourceDefinitionVersion: 1, status: "confirmed", expectedAmount: 1000 });

    const result = resolve({ plannedItems: [item], existingOccurrences: [existing] });

    const [resolved] = result.occurrences;
    expect(resolved.action).toBe("unchanged");
    expect(resolved.occurrence.expectedAmount).toBe(1000);
  });

  it("surfaces an invalid allocation while still including the occurrence in the result", () => {
    const item = plannedItem({
      direction: "inflow",
      sourceAccountId: null,
      allocationMode: "single",
      // Inflow items must have exactly one destination -- this one has none.
      destinations: [],
    });
    const result = resolve({ plannedItems: [item] });

    expect(result.occurrences).toHaveLength(1);
    const [resolved] = result.occurrences;
    expect(resolved.isValid).toBe(false);
    expect(resolved.validationIssues.length).toBeGreaterThan(0);
    // Invalid occurrences must not silently count toward the headline
    // summary numbers.
    expect(result.summary.income).toBe(0);
  });

  it("buckets destination amounts into savings/investments by the destination account's type", () => {
    const item = plannedItem({
      amount: 400,
      allocationMode: "equal_split",
      destinations: [
        destination({ id: "tmpl-1", destinationAccountId: "acct-savings", sortOrder: 0 }),
        destination({ id: "tmpl-2", destinationAccountId: "acct-investment", sortOrder: 1 }),
      ],
    });
    const result = resolve({ plannedItems: [item] });

    expect(result.summary.savings).toBe(200);
    expect(result.summary.investments).toBe(200);
    expect(result.summary.plannedExpenses).toBe(400);
  });
});
