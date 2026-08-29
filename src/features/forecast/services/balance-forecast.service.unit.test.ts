import {
  buildAccountBalanceForecasts,
  combineBalanceForecasts,
  type BalanceForecastPlannedItemContribution,
  type BalanceForecastRecurringRule,
} from "./balance-forecast.service";

const asOf = new Date(Date.UTC(2026, 6, 1)); // 2026-07-01

function forecast(overrides: Partial<Parameters<typeof buildAccountBalanceForecasts>[0]> = {}) {
  return buildAccountBalanceForecasts({
    accounts: [{ id: "account-1", currentBalance: 1_000 }],
    recurringRules: [],
    plannedItemContributions: [],
    horizonMonths: 6,
    asOf,
    ...overrides,
  });
}

describe("buildAccountBalanceForecasts", () => {
  it("projects a flat balance for an account with no active rules", () => {
    const result = forecast().get("account-1")!;

    expect(result.currentBalance).toBe(1_000);
    expect(result.monthlyMovement).toBe(0);
    expect(result.sources).toEqual([]);
    expect(result.timeline).toHaveLength(6);
    expect(result.timeline.every((item) => item.balance === 1_000 && item.movement === 0)).toBe(true);
  });

  it("adds a recurring income rule's monthly amount to the account's balance each month", () => {
    const recurringRules: BalanceForecastRecurringRule[] = [
      {
        id: "salary",
        ruleKind: "transaction",
        type: "income",
        accountId: "account-1",
        amount: 300,
        frequency: "monthly",
        isActive: true,
        nextRun: "2026-07-10",
      },
    ];

    const result = forecast({ recurringRules }).get("account-1")!;

    expect(result.monthlyMovement).toBe(300);
    expect(result.sources).toEqual([{ kind: "recurring_income", monthlyMovement: 300, movementCount: 1 }]);
    expect(result.timeline.map((item) => item.balance)).toEqual([1_300, 1_600, 1_900, 2_200, 2_500, 2_800]);
    expect(result.timeline.map((item) => item.movement)).toEqual([300, 300, 300, 300, 300, 300]);
  });

  it("subtracts a recurring expense rule's monthly amount from the account's balance", () => {
    const recurringRules: BalanceForecastRecurringRule[] = [
      {
        id: "rent",
        ruleKind: "transaction",
        type: "expense",
        accountId: "account-1",
        amount: 500,
        frequency: "monthly",
        isActive: true,
        nextRun: "2026-07-05",
      },
    ];

    const result = forecast({ recurringRules }).get("account-1")!;

    expect(result.monthlyMovement).toBe(-500);
    expect(result.sources).toEqual([{ kind: "recurring_expense", monthlyMovement: -500, movementCount: 1 }]);
    expect(result.timeline.map((item) => item.balance)).toEqual([500, 0, -500, -1_000, -1_500, -2_000]);
  });

  it("skips an inactive rule entirely", () => {
    const recurringRules: BalanceForecastRecurringRule[] = [
      {
        id: "inactive",
        ruleKind: "transaction",
        type: "income",
        accountId: "account-1",
        amount: 900,
        frequency: "monthly",
        isActive: false,
        nextRun: "2026-07-10",
      },
    ];

    const result = forecast({ recurringRules }).get("account-1")!;

    expect(result.monthlyMovement).toBe(0);
    expect(result.timeline.every((item) => item.balance === 1_000)).toBe(true);
  });

  it("moves money between two accounts for a recurring transfer, without double counting", () => {
    const recurringRules: BalanceForecastRecurringRule[] = [
      {
        id: "transfer-1",
        ruleKind: "transfer",
        type: "expense",
        accountId: "account-1",
        destinationAccountId: "account-2",
        amount: 200,
        frequency: "monthly",
        isActive: true,
        nextRun: "2026-07-10",
      },
    ];

    const forecasts = forecast({
      accounts: [
        { id: "account-1", currentBalance: 1_000 },
        { id: "account-2", currentBalance: 100 },
      ],
      recurringRules,
    });

    const source = forecasts.get("account-1")!;
    const destination = forecasts.get("account-2")!;

    expect(source.monthlyMovement).toBe(-200);
    expect(destination.monthlyMovement).toBe(200);
    expect(source.timeline.map((item) => item.balance)).toEqual([800, 600, 400, 200, 0, -200]);
    expect(destination.timeline.map((item) => item.balance)).toEqual([300, 500, 700, 900, 1_100, 1_300]);

    // Combining both accounts must net the transfer to zero — the total
    // household balance doesn't change just because money moved between
    // two accounts it already owns.
    const combined = combineBalanceForecasts([source, destination]);
    expect(combined.currentBalance).toBe(1_100);
    expect(combined.monthlyMovement).toBe(0);
    expect(combined.timeline.every((item) => item.movement === 0)).toBe(true);
    expect(combined.timeline.every((item) => item.balance === 1_100)).toBe(true);
  });

  it("moves money for each planned-item destination contribution independently, one per account pair", () => {
    // Mirrors what buildPlannedItemForecastContributions resolves a
    // two-destination equal_split Monthly Budget item into: one already-
    // flattened contribution per destination account, each carrying its
    // own resolved amount and due-month schedule (never a rule total plus
    // an allocations array — that fan-out already happened upstream).
    const plannedItemContributions: BalanceForecastPlannedItemContribution[] = [
      {
        id: "item-1:savings-1",
        sourceAccountId: "checking",
        destinationAccountId: "savings-1",
        amount: 100,
        isActive: true,
        dueMonthKeys: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"],
        skipMonthKeys: [],
      },
      {
        id: "item-1:savings-2",
        sourceAccountId: "checking",
        destinationAccountId: "savings-2",
        amount: 100,
        isActive: true,
        dueMonthKeys: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"],
        skipMonthKeys: [],
      },
    ];

    const forecasts = forecast({
      accounts: [
        { id: "checking", currentBalance: 2_000 },
        { id: "savings-1", currentBalance: 0 },
        { id: "savings-2", currentBalance: 0 },
      ],
      plannedItemContributions,
    });

    const source = forecasts.get("checking")!;
    const dest1 = forecasts.get("savings-1")!;
    const dest2 = forecasts.get("savings-2")!;

    expect(source.monthlyMovement).toBe(-200);
    // One outgoing movement per destination contribution (not per planned
    // item) on the source side — two destinations, so the source account
    // sees two monthly_budget movements even though both come from the
    // same item.
    expect(source.sources).toEqual([{ kind: "monthly_budget", monthlyMovement: -200, movementCount: 2 }]);
    expect(dest1.monthlyMovement).toBe(100);
    expect(dest2.monthlyMovement).toBe(100);
    expect(source.timeline[0].balance).toBe(1_800);
    expect(dest1.timeline[0].balance).toBe(100);
    expect(dest2.timeline[0].balance).toBe(100);

    const combined = combineBalanceForecasts([source, dest1, dest2]);
    expect(combined.monthlyMovement).toBe(0);
    expect(combined.currentBalance).toBe(2_000);
    expect(combined.timeline.every((item) => item.balance === 2_000)).toBe(true);
  });

  it("only applies a planned-item contribution during its precomputed due months", () => {
    // dueMonthKeys is where a specific_months/interval planned item's
    // recurrence (resolved via isPlannedItemDueInMonth upstream) is
    // expressed at this layer — there's no separate active-months window
    // concept here any more.
    const plannedItemContributions: BalanceForecastPlannedItemContribution[] = [
      {
        id: "item-summer:savings-1",
        sourceAccountId: "checking",
        destinationAccountId: "savings-1",
        amount: 50,
        isActive: true,
        dueMonthKeys: ["2026-07", "2026-08"],
        skipMonthKeys: [],
      },
    ];

    const result = forecast({
      accounts: [
        { id: "checking", currentBalance: 1_000 },
        { id: "savings-1", currentBalance: 0 },
      ],
      plannedItemContributions,
      horizonMonths: 4, // Jul, Aug, Sep, Oct 2026
    }).get("savings-1")!;

    expect(result.timeline.map((item) => item.movement)).toEqual([50, 50, 0, 0]);
  });

  it("skips a due month whose occurrence is already known to be settled", () => {
    const plannedItemContributions: BalanceForecastPlannedItemContribution[] = [
      {
        id: "item-1:savings-1",
        sourceAccountId: "checking",
        destinationAccountId: "savings-1",
        amount: 50,
        isActive: true,
        dueMonthKeys: ["2026-07", "2026-08", "2026-09"],
        // The caller (useAccountBalanceForecasts) determines settled
        // months from real planned_item_occurrences data, per (item,
        // month) -- not just "the current calendar month".
        skipMonthKeys: ["2026-07"],
      },
    ];

    const result = forecast({
      accounts: [
        { id: "checking", currentBalance: 1_000 },
        { id: "savings-1", currentBalance: 0 },
      ],
      plannedItemContributions,
      horizonMonths: 3,
    }).get("savings-1")!;

    // July (the current month) already ran for real and is reflected in
    // currentBalance, so the forecast must not project it again.
    expect(result.timeline.map((item) => item.movement)).toEqual([0, 50, 50]);
  });

  it("resolves a legacy recurring transfer's destination pot to its first assigned account", () => {
    const recurringRules: BalanceForecastRecurringRule[] = [
      {
        id: "legacy-transfer",
        ruleKind: "transfer",
        type: "expense",
        accountId: "checking",
        destinationPotId: "pot-1",
        amount: 75,
        frequency: "monthly",
        isActive: true,
        nextRun: "2026-07-10",
      },
    ];

    const result = forecast({
      accounts: [
        { id: "checking", currentBalance: 500 },
        { id: "pot-account-1", currentBalance: 0 },
      ],
      recurringRules,
      savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "pot-account-1" }],
    }).get("pot-account-1")!;

    expect(result.monthlyMovement).toBe(75);
  });
});

describe("combineBalanceForecasts", () => {
  it("returns a zeroed forecast for an empty list", () => {
    expect(combineBalanceForecasts([])).toEqual({ currentBalance: 0, monthlyMovement: 0, sources: [], timeline: [] });
  });
});
