import { resolvePlannedMonth } from "@/features/planned-items/services/planned-items-resolver";
import type {
  PlannedItemAccountLike,
  PlannedItemDestination,
  PlannedItemOccurrence,
  PlannedItemWithDestinations,
} from "@/features/planned-items/types";

import {
  buildCategoryBudgetViewModel,
  resolveActiveCategoryBudgets,
  type CategoryBudgetAccountLike,
  type CategoryBudgetCategoryLike,
  type CategoryBudgetTransactionLike,
} from "./category-budget-view-model";
import type { CategoryBudget } from "../types";

const HOUSEHOLD_ID = "household-1";
const MONTH = "2026-09";

function budget(overrides: Partial<CategoryBudget> = {}): CategoryBudget {
  return {
    id: `budget-${Math.random().toString(36).slice(2, 8)}`,
    householdId: HOUSEHOLD_ID,
    categoryId: "food",
    amount: 500,
    effectiveMonth: "2026-01-01",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function account(id: string, type: CategoryBudgetAccountLike["type"] = "bank"): PlannedItemAccountLike {
  return { id, type };
}

function transaction(overrides: Partial<CategoryBudgetTransactionLike> = {}): CategoryBudgetTransactionLike {
  return {
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    type: "expense",
    amount: 0,
    accountId: "acct-source",
    title: "Transaction",
    transactionDate: "2026-09-15",
    accountName: "Checking",
    categoryId: null,
    transferGroupId: null,
    // See CategoryBudgetTransactionLike's doc comments -- null/false by
    // default (an ordinary, unlinked transaction); most tests below that
    // exercise paid/linked lines override these explicitly per case.
    linkedOccurrenceId: null,
    isAutoCreatedTransaction: false,
    ...overrides,
  };
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
    amount: 100,
    sourceAccountId: "acct-source",
    categoryId: "food",
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

/** An already-materialized occurrence for `item` this month, at a given status -- lets a test simulate "already confirmed"/"already matched" (paid) without re-deriving the resolver's own create/refresh logic. */
function existingOccurrence(item: PlannedItemWithDestinations, overrides: Partial<PlannedItemOccurrence> = {}): PlannedItemOccurrence {
  return {
    id: `occ-${item.id}`,
    plannedItemId: item.id,
    householdId: HOUSEHOLD_ID,
    month: `${MONTH}-01`,
    status: "planned",
    expectedAmount: item.amount,
    sourceAccountId: item.sourceAccountId,
    categoryId: item.categoryId,
    isEstimate: item.isEstimate,
    sourceDefinitionVersion: item.definitionVersion,
    isOverridden: false,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function resolveMonth(
  plannedItems: PlannedItemWithDestinations[],
  existingOccurrences: PlannedItemOccurrence[] = [],
  accounts: PlannedItemAccountLike[] = [account("acct-source"), account("acct-savings", "savings"), account("acct-investment", "investment")],
) {
  return resolvePlannedMonth({
    householdId: HOUSEHOLD_ID,
    month: MONTH,
    plannedItems,
    existingOccurrences,
    existingOccurrenceDestinations: [],
    accounts,
  });
}

const FOOD_CATEGORIES: CategoryBudgetCategoryLike[] = [
  { id: "food", name: "Food", parentId: null },
  { id: "groceries", name: "Groceries", parentId: "food" },
  { id: "restaurants", name: "Restaurants", parentId: "food" },
  { id: "takeaway", name: "Takeaway", parentId: "food" },
];

describe("resolveActiveCategoryBudgets", () => {
  it("picks the latest effective row at or before the viewed month, never a later one", () => {
    const rows = [
      budget({ categoryId: "food", amount: 400, effectiveMonth: "2026-01-01" }),
      budget({ categoryId: "food", amount: 500, effectiveMonth: "2026-06-01" }),
      budget({ categoryId: "food", amount: 600, effectiveMonth: "2026-12-01" }), // in the future relative to the months below
    ];

    // A caller viewing March would only ever pass rows with effective_month <= March
    // (see CategoryBudgetsRepository.listEffectiveForMonth) -- simulate that pre-filter here.
    const forMarch = rows.filter((row) => row.effectiveMonth <= "2026-03-01");
    expect(resolveActiveCategoryBudgets(forMarch).get("food")?.amount).toBe(400);

    const forAugust = rows.filter((row) => row.effectiveMonth <= "2026-08-01");
    expect(resolveActiveCategoryBudgets(forAugust).get("food")?.amount).toBe(500);
  });

  it("changing a limit never rewrites an earlier month's already-resolved amount", () => {
    // The user sets 400 in January, then changes it to 500 starting in June.
    // Looking at May must still see 400 -- exactly the historical-correctness
    // guarantee the effective-month model exists for.
    const rows = [
      budget({ categoryId: "food", amount: 400, effectiveMonth: "2026-01-01" }),
      budget({ categoryId: "food", amount: 500, effectiveMonth: "2026-06-01" }),
    ];
    const forMay = rows.filter((row) => row.effectiveMonth <= "2026-05-01");
    expect(resolveActiveCategoryBudgets(forMay).get("food")?.amount).toBe(400);
  });
});

describe("buildCategoryBudgetViewModel", () => {
  it("computes budget/spent/remaining/percent for a plain category with no planned items", () => {
    const transactions = [
      transaction({ id: "t1", categoryId: "food", amount: 200 }),
      transaction({ id: "t2", categoryId: "food", amount: 100 }),
    ];
    const resolved = resolveMonth([]);
    const viewModel = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: FOOD_CATEGORIES,
      budgets: [budget({ categoryId: "food", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map(),
    });

    const entry = viewModel.entries.find((e) => e.categoryId === "food")!;
    expect(entry.actualSpent).toBe(300);
    expect(entry.unpaidTotal).toBe(0);
    expect(entry.expectedTotal).toBe(300);
    expect(entry.remaining).toBe(200);
    expect(entry.percentUsed).toBe(60);
    expect(entry.status).toBe("ok");
  });

  it("excludes a transfer's expense leg from spend when its destination is a savings/investment account, even if categorized", () => {
    const transactions = [
      // A Monthly-Budget-generated transfer tagged "Food" (unusual, but the
      // rule must not care about the category, only the destination
      // account type) landing on a savings account -- must be excluded.
      transaction({ id: "t-out", type: "expense", categoryId: "food", amount: 1000, accountId: "acct-source", transferGroupId: "tg1" }),
      transaction({ id: "t-in", type: "income", categoryId: null, amount: 1000, accountId: "acct-savings", transferGroupId: "tg1" }),
      // A transfer whose destination is an ordinary bank account, tagged
      // with a category -- NOT excluded, counts like any other expense.
      transaction({ id: "t-out-2", type: "expense", categoryId: "food", amount: 60, accountId: "acct-source", transferGroupId: "tg2" }),
      transaction({ id: "t-in-2", type: "income", categoryId: null, amount: 60, accountId: "acct-checking", transferGroupId: "tg2" }),
    ];
    const resolved = resolveMonth([]);
    const viewModel = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: FOOD_CATEGORIES,
      budgets: [budget({ categoryId: "food", amount: 500 })],
      transactions,
      accounts: [account("acct-source"), account("acct-savings", "savings"), account("acct-checking", "bank")],
      resolved,
      plannedItemNameById: new Map(),
    });

    const entry = viewModel.entries.find((e) => e.categoryId === "food")!;
    expect(entry.actualSpent).toBe(60);
  });

  it("rolls up child category spend into a budgeted parent, per the Food/Groceries/Restaurants/Takeaway example", () => {
    const transactions = [
      transaction({ id: "t-groceries", categoryId: "groceries", amount: 250 }),
      transaction({ id: "t-restaurants", categoryId: "restaurants", amount: 100 }),
      transaction({ id: "t-takeaway", categoryId: "takeaway", amount: 50 }),
    ];
    const resolved = resolveMonth([]);
    const viewModel = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: FOOD_CATEGORIES,
      budgets: [budget({ categoryId: "food", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map(),
    });

    const entry = viewModel.entries.find((e) => e.categoryId === "food")!;
    expect(entry.actualSpent).toBe(400);
    expect(entry.remaining).toBe(100);
    expect(entry.percentUsed).toBe(80);
    expect(entry.status).toBe("ok");
    expect(entry.childBreakdown.map((c) => [c.categoryId, c.actualSpent]).sort()).toEqual(
      [
        ["groceries", 250],
        ["restaurants", 100],
        ["takeaway", 50],
      ].sort(),
    );

    // A child with no budget of its own gets no top-level entry.
    expect(viewModel.entries.find((e) => e.categoryId === "groceries")).toBeUndefined();
  });

  it("matches the Utilities example: paid recurring items count as actual spend, unpaid ones as still-expected, with no double counting", () => {
    const electricity = plannedItem({ id: "item-electricity", name: "Electricity", amount: 110, categoryId: "utilities" });
    const internet = plannedItem({ id: "item-internet", name: "Internet", amount: 40, categoryId: "utilities" });
    const water = plannedItem({ id: "item-water", name: "Water", amount: 35, categoryId: "utilities" });

    // Electricity and Internet were already paid -- confirmed via Monthly
    // Budget, which already posted the matching real transactions below.
    // Water is still unpaid: no matching real transaction, occurrence
    // stays 'planned'.
    const resolved = resolveMonth(
      [electricity, internet, water],
      [
        existingOccurrence(electricity, { status: "confirmed", confirmedAt: "2026-09-05T00:00:00.000Z" }),
        existingOccurrence(internet, { status: "matched" }),
      ],
    );

    const transactions = [
      transaction({ id: "t-electricity", categoryId: "utilities", amount: 110 }),
      transaction({ id: "t-internet", categoryId: "utilities", amount: 40 }),
    ];

    const categories: CategoryBudgetCategoryLike[] = [{ id: "utilities", name: "Utilities", parentId: null }];
    const plannedItemNameById = new Map([
      ["item-electricity", "Electricity"],
      ["item-internet", "Internet"],
      ["item-water", "Water"],
    ]);

    const viewModel = buildCategoryBudgetViewModel({
      month: MONTH,
      categories,
      budgets: [budget({ categoryId: "utilities", amount: 200 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById,
    });

    const entry = viewModel.entries.find((e) => e.categoryId === "utilities")!;
    expect(entry.actualSpent).toBe(150); // Electricity + Internet, from real transactions -- not doubled by their now-confirmed/matched occurrences.
    expect(entry.unpaidTotal).toBe(35); // Water only.
    expect(entry.expectedTotal).toBe(185);
    expect(entry.remaining).toBe(15);
    expect(entry.percentUsed).toBe(92.5);
    expect(entry.status).toBe("approaching");

    expect(entry.own.plannedUnpaid).toHaveLength(1);
    expect(entry.own.plannedUnpaid[0].name).toBe("Water");
    // Water is a plain expense (0 destinations, per plannedItem()'s default) -- eligible for the one-click "mark as paid" action.
    expect(entry.own.plannedUnpaid[0].canMarkPaid).toBe(true);
    expect(entry.own.plannedPaid.map((line) => line.name).sort()).toEqual(["Electricity", "Internet"]);

    // Once Water is paid (a real transaction now exists and its occurrence
    // is matched), it must move out of unpaid entirely -- actual spend
    // becomes 185, nothing left "still expected".
    const resolvedAfterPaying = resolveMonth(
      [electricity, internet, water],
      [
        existingOccurrence(electricity, { status: "confirmed" }),
        existingOccurrence(internet, { status: "matched" }),
        existingOccurrence(water, { status: "matched" }),
      ],
    );
    const transactionsAfterPaying = [...transactions, transaction({ id: "t-water", categoryId: "utilities", amount: 35 })];
    const entryAfterPaying = buildCategoryBudgetViewModel({
      month: MONTH,
      categories,
      budgets: [budget({ categoryId: "utilities", amount: 200 })],
      transactions: transactionsAfterPaying,
      accounts: [account("acct-source")],
      resolved: resolvedAfterPaying,
      plannedItemNameById,
    }).entries.find((e) => e.categoryId === "utilities")!;

    expect(entryAfterPaying.actualSpent).toBe(185);
    expect(entryAfterPaying.unpaidTotal).toBe(0);
    expect(entryAfterPaying.own.plannedUnpaid).toHaveLength(0);
  });

  it("flags a category over its limit once expectedTotal exceeds the budget", () => {
    const transactions = [transaction({ id: "t1", categoryId: "food", amount: 550 })];
    const resolved = resolveMonth([]);
    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: FOOD_CATEGORIES,
      budgets: [budget({ categoryId: "food", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map(),
    }).entries.find((e) => e.categoryId === "food")!;

    expect(entry.remaining).toBe(-50);
    expect(entry.percentUsed).toBe(110);
    expect(entry.status).toBe("over");
  });

  it("only flags a planned line canMarkPaid when its occurrence is a single-leg plain expense (0 destinations) -- a split/transfer item is not", () => {
    // Rent: a plain expense, no destination accounts -- confirm_planned_item_occurrence's exact eligible shape.
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 800, categoryId: "housing" });
    // Cleaning service: a single-destination outflow landing on an ordinary bank account (not a savings/investment pot, so it's not netted out of pureExpenseAmount the way Investments would be -- see splitOutflowOccurrenceExpenseFromPots) -- resolves to a transfer_source/transfer_destination leg pair, which confirm_planned_item_occurrence deliberately does not handle (see its migration doc comment).
    const cleaningService = plannedItem({
      id: "item-cleaning",
      name: "Cleaning service",
      amount: 60,
      categoryId: "housing",
      allocationMode: "single",
      destinations: [destination({ id: "dest-cleaning", plannedItemId: "item-cleaning", destinationAccountId: "acct-shared" })],
    });

    const resolved = resolveMonth([rent, cleaningService], [], [account("acct-source"), account("acct-shared", "bank")]);

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "housing", name: "Housing", parentId: null }],
      budgets: [budget({ categoryId: "housing", amount: 1200 })],
      transactions: [],
      accounts: [account("acct-source"), account("acct-shared", "bank")],
      resolved,
      plannedItemNameById: new Map([
        ["item-rent", "Rent"],
        ["item-cleaning", "Cleaning service"],
      ]),
    }).entries.find((e) => e.categoryId === "housing")!;

    const rentLine = entry.own.plannedUnpaid.find((line) => line.name === "Rent")!;
    const cleaningLine = entry.own.plannedUnpaid.find((line) => line.name === "Cleaning service")!;
    expect(rentLine.canMarkPaid).toBe(true);
    expect(cleaningLine.canMarkPaid).toBe(false);
  });
});

// The scenarios below exercise the "mark as paid / link / actual amount /
// unmark as paid" feature's data-shaping side -- everything a caller needs
// to render requirement 2 (actual can differ from planned, current-month-
// only), requirement 3 (the expandable transaction list) and requirement 6
// (double-counting) purely from buildCategoryBudgetViewModel's output.
// Mutating RPCs themselves (confirm/match/unmatch/unlink/revert) are
// exercised by the Supabase contract tests, not here -- this module has no
// DB access of its own, see its own module doc comment.
describe("paid occurrence actual-vs-expected amounts and transaction lineage", () => {
  it("uses the linked transaction's real amount for budget math, not the planned amount, while the planned line keeps its original expected amount (spec example: limit 500, planned 200, actual 150 -> remaining 350)", () => {
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 200, categoryId: "housing" });
    const resolved = resolveMonth([rent], [existingOccurrence(rent, { status: "confirmed" })]);
    const transactions = [
      transaction({ id: "t-rent", categoryId: "housing", amount: 150, linkedOccurrenceId: "occ-item-rent", isAutoCreatedTransaction: true }),
    ];

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "housing", name: "Housing", parentId: null }],
      budgets: [budget({ categoryId: "housing", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map([["item-rent", "Rent"]]),
    }).entries.find((e) => e.categoryId === "housing")!;

    expect(entry.actualSpent).toBe(150); // Never the planned 200.
    expect(entry.unpaidTotal).toBe(0); // Paid -- no longer "still expected", and not double-counted alongside actualSpent.
    expect(entry.expectedTotal).toBe(150);
    expect(entry.remaining).toBe(350);

    const rentLine = entry.own.plannedPaid.find((line) => line.name === "Rent")!;
    expect(rentLine.amount).toBe(200); // Original expected amount preserved for the expected-vs-actual comparison.
    expect(rentLine.actualAmount).toBe(150);
    expect(rentLine.matchedTransactionId).toBe("t-rent");
    expect(rentLine.isAutoCreated).toBe(true);
  });

  it("never mutates the planned/recurring definition's expected amount for a future month when the current month is paid at a different actual amount", () => {
    // confirm_planned_item_occurrence's p_actual_amount only ever affects
    // the transaction it creates, never planned_items.amount or a future
    // occurrence's expected_amount (see that RPC's migration doc comment)
    // -- simulated here across two independently-resolved months for the
    // same definition, with no override applied to the definition itself.
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 200, categoryId: "housing" });

    const thisMonthResolved = resolveMonth([rent], [existingOccurrence(rent, { status: "confirmed" })]);
    const thisMonthOccurrence = thisMonthResolved.occurrences.find((resolvedOccurrence) => resolvedOccurrence.occurrence.plannedItemId === "item-rent")!;
    expect(thisMonthOccurrence.occurrence.expectedAmount).toBe(200);

    const nextMonthResolved = resolvePlannedMonth({
      householdId: HOUSEHOLD_ID,
      month: "2026-10",
      plannedItems: [rent],
      existingOccurrences: [],
      existingOccurrenceDestinations: [],
      accounts: [account("acct-source")],
    });
    const nextMonthOccurrence = nextMonthResolved.occurrences.find((resolvedOccurrence) => resolvedOccurrence.occurrence.plannedItemId === "item-rent")!;
    expect(nextMonthOccurrence.occurrence.expectedAmount).toBe(200); // Still 200 -- unaffected by this month's 150 actual.
  });

  it("distinguishes an auto-created (confirmed) paid line from a manually-linked (matched) one via isAutoCreated, so the UI knows which 'unmark as paid' options to offer", () => {
    const electricity = plannedItem({ id: "item-electricity", name: "Electricity", amount: 110, categoryId: "utilities" });
    const internet = plannedItem({ id: "item-internet", name: "Internet", amount: 40, categoryId: "utilities" });
    const resolved = resolveMonth(
      [electricity, internet],
      [
        existingOccurrence(electricity, { status: "confirmed" }), // paid via "mark as paid -> create transaction"
        existingOccurrence(internet, { status: "matched" }), // paid via "link an existing transaction"
      ],
    );
    const transactions = [
      transaction({ id: "t-electricity", categoryId: "utilities", amount: 110, linkedOccurrenceId: "occ-item-electricity", isAutoCreatedTransaction: true }),
      transaction({ id: "t-internet", categoryId: "utilities", amount: 40, linkedOccurrenceId: "occ-item-internet", isAutoCreatedTransaction: false }),
    ];

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "utilities", name: "Utilities", parentId: null }],
      budgets: [budget({ categoryId: "utilities", amount: 200 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map([
        ["item-electricity", "Electricity"],
        ["item-internet", "Internet"],
      ]),
    }).entries.find((e) => e.categoryId === "utilities")!;

    const electricityLine = entry.own.plannedPaid.find((line) => line.name === "Electricity")!;
    const internetLine = entry.own.plannedPaid.find((line) => line.name === "Internet")!;
    expect(electricityLine.isAutoCreated).toBe(true);
    expect(internetLine.isAutoCreated).toBe(false);
  });

  it("carries every real transaction for a category into own.transactions with its own linked-occurrence lineage -- the source for the expandable transaction list", () => {
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 200, categoryId: "housing" });
    const resolved = resolveMonth([rent], [existingOccurrence(rent, { status: "confirmed" })]);
    const transactions = [
      transaction({
        id: "t-rent",
        categoryId: "housing",
        amount: 200,
        title: "Landlord",
        transactionDate: "2026-09-01",
        accountName: "Checking",
        linkedOccurrenceId: "occ-item-rent",
        isAutoCreatedTransaction: true,
      }),
      // An unrelated, never-planned expense in the same category -- must still show up in the list, just with no linkedOccurrenceId.
      transaction({ id: "t-extra", categoryId: "housing", amount: 25, title: "Hardware store", transactionDate: "2026-09-12", accountName: "Credit card" }),
    ];

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "housing", name: "Housing", parentId: null }],
      budgets: [budget({ categoryId: "housing", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map([["item-rent", "Rent"]]),
    }).entries.find((e) => e.categoryId === "housing")!;

    expect(entry.own.transactions).toHaveLength(2);
    const rentTx = entry.own.transactions.find((t) => t.id === "t-rent")!;
    const extraTx = entry.own.transactions.find((t) => t.id === "t-extra")!;
    expect(rentTx.linkedOccurrenceId).toBe("occ-item-rent");
    expect(rentTx.isAutoCreatedTransaction).toBe(true);
    expect(rentTx.title).toBe("Landlord");
    expect(extraTx.linkedOccurrenceId).toBeNull();
    expect(extraTx.isAutoCreatedTransaction).toBe(false);
  });

  it("falls back to no actual/matched-transaction fields when an occurrence is paid but its linking transaction hasn't loaded yet, instead of crashing or showing a bogus amount", () => {
    // Guards computePlannedLinesByCategory's own documented fallback --
    // status can flip to 'confirmed'/'matched' before the transaction list
    // necessarily reflects it (e.g. still syncing).
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 200, categoryId: "housing" });
    const resolved = resolveMonth([rent], [existingOccurrence(rent, { status: "confirmed" })]);

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "housing", name: "Housing", parentId: null }],
      budgets: [budget({ categoryId: "housing", amount: 500 })],
      transactions: [], // No transaction loaded yet.
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map([["item-rent", "Rent"]]),
    }).entries.find((e) => e.categoryId === "housing")!;

    const rentLine = entry.own.plannedPaid.find((line) => line.name === "Rent")!;
    expect(rentLine.actualAmount).toBeNull();
    expect(rentLine.matchedTransactionId).toBeNull();
    expect(rentLine.isAutoCreated).toBe(false);
  });

  it("handles multiple independently-paid occurrences in the same category without cross-linking their transactions (each keeps its own actual amount and lineage)", () => {
    const rent = plannedItem({ id: "item-rent", name: "Rent", amount: 200, categoryId: "housing" });
    const insurance = plannedItem({ id: "item-insurance", name: "Home insurance", amount: 30, categoryId: "housing" });
    const resolved = resolveMonth(
      [rent, insurance],
      [existingOccurrence(rent, { status: "confirmed" }), existingOccurrence(insurance, { status: "matched" })],
    );
    const transactions = [
      transaction({ id: "t-rent", categoryId: "housing", amount: 195, linkedOccurrenceId: "occ-item-rent", isAutoCreatedTransaction: true }),
      transaction({ id: "t-insurance", categoryId: "housing", amount: 30, linkedOccurrenceId: "occ-item-insurance", isAutoCreatedTransaction: false }),
    ];

    const entry = buildCategoryBudgetViewModel({
      month: MONTH,
      categories: [{ id: "housing", name: "Housing", parentId: null }],
      budgets: [budget({ categoryId: "housing", amount: 500 })],
      transactions,
      accounts: [account("acct-source")],
      resolved,
      plannedItemNameById: new Map([
        ["item-rent", "Rent"],
        ["item-insurance", "Home insurance"],
      ]),
    }).entries.find((e) => e.categoryId === "housing")!;

    expect(entry.actualSpent).toBe(225); // 195 + 30, each transaction's own real amount, no double counting.
    expect(entry.unpaidTotal).toBe(0);
    const rentLine = entry.own.plannedPaid.find((line) => line.name === "Rent")!;
    const insuranceLine = entry.own.plannedPaid.find((line) => line.name === "Home insurance")!;
    expect(rentLine.matchedTransactionId).toBe("t-rent");
    expect(rentLine.actualAmount).toBe(195);
    expect(insuranceLine.matchedTransactionId).toBe("t-insurance");
    expect(insuranceLine.actualAmount).toBe(30);
  });
});
