import { resolvePlannedMonth } from "./planned-items-resolver";
import { buildMonthlyPreviewViewModel } from "./monthly-preview-view-model";
import type { MonthlyPreviewAccount } from "./monthly-preview-view-model";
import type {
  PlannedItemAccountLike,
  PlannedItemDestination,
  PlannedItemWithDestinations,
} from "../types";

const HOUSEHOLD_ID = "household-1";
const MONTH = "2026-09";

function account(id: string, type: PlannedItemAccountLike["type"] = "bank"): PlannedItemAccountLike {
  return { id, type };
}

function impactAccount(
  id: string,
  overrides: Partial<MonthlyPreviewAccount> = {},
): MonthlyPreviewAccount {
  return { id, type: "bank", ownerProfileId: null, currentBalance: 0, ...overrides };
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
    name: "Item",
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

const RESOLVER_ACCOUNTS: PlannedItemAccountLike[] = [
  account("acct-source"),
  account("acct-savings", "savings"),
  account("acct-investment", "investment"),
];

function resolveMonth(plannedItems: PlannedItemWithDestinations[]) {
  return resolvePlannedMonth({
    householdId: HOUSEHOLD_ID,
    month: MONTH,
    plannedItems,
    existingOccurrences: [],
    existingOccurrenceDestinations: [],
    accounts: RESOLVER_ACCOUNTS,
  });
}

describe("buildMonthlyPreviewViewModel", () => {
  it("excludes savings/investment transfers from `expenses` so income = expenses + savings + investments + remaining", () => {
    const income = plannedItem({
      id: "item-income",
      name: "Salary",
      direction: "inflow",
      amount: 5000,
      sourceAccountId: null,
      destinations: [destination({ id: "tmpl-income", plannedItemId: "item-income", destinationAccountId: "acct-source" })],
    });
    const rent = plannedItem({
      id: "item-rent",
      name: "Rent",
      amount: 1500,
      sourceAccountId: "acct-source",
      destinations: [],
    });
    const toSavings = plannedItem({
      id: "item-savings",
      name: "Move to savings",
      amount: 1000,
      sourceAccountId: "acct-source",
      destinations: [destination({ id: "tmpl-savings", plannedItemId: "item-savings", destinationAccountId: "acct-savings" })],
    });
    const toInvestment = plannedItem({
      id: "item-investment",
      name: "Move to investment",
      amount: 500,
      sourceAccountId: "acct-source",
      destinations: [destination({ id: "tmpl-investment", plannedItemId: "item-investment", destinationAccountId: "acct-investment" })],
    });

    const resolved = resolveMonth([income, rent, toSavings, toInvestment]);
    const viewModel = buildMonthlyPreviewViewModel({
      resolved,
      accounts: [impactAccount("acct-source"), impactAccount("acct-savings", { type: "savings" }), impactAccount("acct-investment", { type: "investment" })],
    });

    expect(viewModel.totalIncome).toBe(5000);
    expect(viewModel.allocations.expenses).toBe(1500);
    expect(viewModel.allocations.savings).toBe(1000);
    expect(viewModel.allocations.investments).toBe(500);
    expect(viewModel.allocated).toBe(3000);
    expect(viewModel.remaining).toBe(2000);
    expect(viewModel.isOverAllocated).toBe(false);
    // The canonical relationship: income = expenses + savings + investments + remaining.
    expect(
      viewModel.allocations.expenses + viewModel.allocations.savings + viewModel.allocations.investments + viewModel.remaining,
    ).toBe(viewModel.totalIncome);
  });

  it("flags over-allocation with a clear amount instead of a negative remaining", () => {
    const income = plannedItem({
      id: "item-income",
      direction: "inflow",
      amount: 1000,
      sourceAccountId: null,
      destinations: [destination({ id: "tmpl-income", plannedItemId: "item-income", destinationAccountId: "acct-source" })],
    });
    const bigExpense = plannedItem({
      id: "item-expense",
      amount: 1400,
      sourceAccountId: "acct-source",
      destinations: [],
    });

    const resolved = resolveMonth([income, bigExpense]);
    const viewModel = buildMonthlyPreviewViewModel({ resolved, accounts: [impactAccount("acct-source")] });

    expect(viewModel.remaining).toBe(0);
    expect(viewModel.isOverAllocated).toBe(true);
    expect(viewModel.overAllocatedBy).toBe(400);
    const segmentKeys = viewModel.segments.map((segment) => segment.key);
    expect(segmentKeys).toContain("overBudget");
    expect(segmentKeys).not.toContain("remaining");
  });

  it("computes account impact before/change/after from real current balances, only for accounts with activity", () => {
    const income = plannedItem({
      id: "item-income",
      direction: "inflow",
      amount: 2000,
      sourceAccountId: null,
      destinations: [destination({ id: "tmpl-income", plannedItemId: "item-income", destinationAccountId: "acct-source" })],
    });
    const rent = plannedItem({
      id: "item-rent",
      amount: 800,
      sourceAccountId: "acct-source",
      destinations: [],
    });

    const resolved = resolveMonth([income, rent]);
    const viewModel = buildMonthlyPreviewViewModel({
      resolved,
      accounts: [
        impactAccount("acct-source", { currentBalance: 500, ownerProfileId: "user-1" }),
        impactAccount("acct-untouched", { currentBalance: 999 }),
      ],
    });

    expect(viewModel.accountImpacts).toHaveLength(1);
    const [impact] = viewModel.accountImpacts;
    expect(impact.accountId).toBe("acct-source");
    expect(impact.ownerProfileId).toBe("user-1");
    expect(impact.before).toBe(500);
    expect(impact.change).toBe(1200); // +2000 income, -800 rent
    expect(impact.after).toBe(1700);
  });

  it("hides the compared-with-last-month block when no previous month is supplied, and computes deltas when it is", () => {
    const income = plannedItem({
      id: "item-income",
      direction: "inflow",
      amount: 2000,
      sourceAccountId: null,
      destinations: [destination({ id: "tmpl-income", plannedItemId: "item-income", destinationAccountId: "acct-source" })],
    });
    const resolved = resolveMonth([income]);

    const withoutPrevious = buildMonthlyPreviewViewModel({ resolved, accounts: [impactAccount("acct-source")] });
    expect(withoutPrevious.comparedWithLastMonth).toBeNull();

    const withPrevious = buildMonthlyPreviewViewModel({
      resolved,
      accounts: [impactAccount("acct-source")],
      previousMonth: { income: 1800, expenses: 0, savings: 0, investments: 0, remaining: 1800 },
    });
    expect(withPrevious.comparedWithLastMonth).toEqual({ income: 200, expenses: 0, savings: 0, investments: 0, remaining: 200 });
  });

  it("handles a zero-income month without dividing by zero", () => {
    const resolved = resolveMonth([]);
    const viewModel = buildMonthlyPreviewViewModel({ resolved, accounts: [] });

    expect(viewModel.totalIncome).toBe(0);
    expect(viewModel.allocated).toBe(0);
    expect(viewModel.remaining).toBe(0);
    expect(viewModel.isOverAllocated).toBe(false);
    for (const segment of viewModel.segments) {
      expect(Number.isFinite(segment.percent)).toBe(true);
    }
  });
});
