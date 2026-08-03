import {
  buildBillCalendar,
  calculateCashFlowReport,
  calculateCategorySpending,
  calculateMerchantSpending,
  calculateMonthlyFinancialReport,
  detectRecurringPatterns,
  listRuleOccurrences,
  projectAccountBalances,
  summarizeSubscriptions,
} from ".";
import type { InsightRecurringRule, InsightTransaction } from ".";

const expense = (
  overrides: Partial<InsightTransaction> = {},
): InsightTransaction => ({
  id: "tx",
  title: "Café São Bento",
  amount: 10,
  type: "expense",
  transaction_date: "2026-07-01",
  account_id: "checking",
  category_id: "food",
  ...overrides,
});
const recurring = (
  overrides: Partial<InsightRecurringRule> = {},
): InsightRecurringRule => ({
  id: "rule",
  title: "Netflix",
  amount: 12,
  type: "expense",
  frequency: "monthly",
  rule_kind: "transaction",
  expense_kind: "subscription",
  account_id: "checking",
  next_run: "2026-07-31",
  excluded_months: [],
  is_active: true,
  ...overrides,
});

describe("financial insight calculations", () => {
  it("reports cash flow, category share, and normalized merchants without transfers", () => {
    const rows = [
      expense({ amount: 20 }),
      expense({ id: "income", type: "income", amount: 100 }),
      expense({ id: "two", title: "CAFE, SAO BENTO", amount: 5 }),
      expense({ id: "transfer", amount: 50, transfer_group_id: "group" }),
    ];
    expect(calculateCashFlowReport(rows)).toEqual({
      income: 100,
      expenses: 25,
      net: 75,
      transactionCount: 3,
    });
    expect(calculateCategorySpending(rows)[0]).toMatchObject({
      id: "food",
      amount: 25,
      share: 100,
    });
    expect(calculateMerchantSpending(rows)[0]).toMatchObject({
      merchant: "cafe sao bento",
      amount: 25,
    });
  });

  it("detects stable monthly merchant history", () => {
    const rows = ["2026-05-01", "2026-06-01", "2026-07-01"].map((date, index) =>
      expense({
        id: String(index),
        transaction_date: date,
        amount: 10 + index,
      }),
    );
    expect(detectRecurringPatterns(rows)[0]).toMatchObject({
      frequency: "monthly",
      occurrences: 3,
    });
    expect(
      detectRecurringPatterns(
        rows.map((row, index) => ({ ...row, amount: [5, 50, 9][index] })),
      ),
    ).toEqual([]);
  });

  it("builds a continuous monthly cash-flow and savings-rate series", () => {
    const rows = [
      expense({
        id: "jan-income",
        type: "income",
        amount: 2000,
        transaction_date: "2026-01-02",
      }),
      expense({
        id: "jan-expense",
        amount: 500,
        transaction_date: "2026-01-03",
      }),
      expense({
        id: "mar-expense",
        amount: 100,
        transaction_date: "2026-03-03",
      }),
      expense({
        id: "transfer",
        amount: 900,
        transaction_date: "2026-01-04",
        transfer_group_id: "move",
      }),
    ];
    expect(
      calculateMonthlyFinancialReport(rows, {
        from: "2026-01-01",
        to: "2026-03-31",
      }),
    ).toEqual([
      {
        month: "2026-01",
        income: 2000,
        expenses: 500,
        net: 1500,
        savingsRate: 75,
      },
      { month: "2026-02", income: 0, expenses: 0, net: 0, savingsRate: null },
      {
        month: "2026-03",
        income: 0,
        expenses: 100,
        net: -100,
        savingsRate: null,
      },
    ]);
  });

  it("generates calendar occurrences and skips excluded months", () => {
    expect(
      listRuleOccurrences(
        recurring({ next_run: "2026-01-31", excluded_months: [2] }),
        "2026-01-01",
        "2026-03-31",
      ),
    ).toEqual(["2026-01-31", "2026-03-28"]);
    expect(
      buildBillCalendar([recurring()], "2026-07-01", "2026-08-31").map(
        (item) => item.date,
      ),
    ).toEqual(["2026-07-31", "2026-08-31"]);
  });

  it("summarizes only explicitly classified active subscriptions", () => {
    expect(
      summarizeSubscriptions([
        recurring(),
        recurring({
          id: "bill",
          title: "Electricity",
          expense_kind: "bill",
          amount: 80,
        }),
        recurring({
          id: "other",
          title: "Allowance",
          expense_kind: "other",
          amount: 25,
        }),
        recurring({
          id: "legacy",
          title: "Unclassified",
          expense_kind: null,
          amount: 30,
        }),
        recurring({ id: "inactive", is_active: false, amount: 40 }),
        recurring({
          id: "income",
          type: "income",
          expense_kind: null,
          amount: 2_000,
        }),
        recurring({
          id: "transfer",
          rule_kind: "transfer",
          expense_kind: null,
          destination_account_id: "savings",
          amount: 100,
        }),
      ]),
    ).toEqual({
      subscriptions: [
        {
          ruleId: "rule",
          title: "Netflix",
          monthlyEquivalent: 12,
          yearlyEquivalent: 144,
          nextRun: "2026-07-31",
        },
      ],
      monthlyTotal: 12,
      yearlyTotal: 144,
    });
  });

  it("projects recurring transfers between accounts without changing household wealth", () => {
    const result = projectAccountBalances(
      [
        { id: "checking", current_balance: 100 },
        { id: "savings", current_balance: 20 },
      ],
      [
        recurring({ amount: 10 }),
        recurring({ id: "salary", type: "income", amount: 50 }),
        recurring({
          id: "move",
          rule_kind: "transfer",
          expense_kind: null,
          amount: 20,
          destination_account_id: "savings",
        }),
      ],
      "2026-07-01",
      "2026-07-31",
    );
    expect(result).toEqual([
      {
        accountId: "checking",
        currentBalance: 100,
        change: 20,
        projectedBalance: 120,
      },
      {
        accountId: "savings",
        currentBalance: 20,
        change: 20,
        projectedBalance: 40,
      },
    ]);
    const transferOnly = projectAccountBalances(
      [
        { id: "checking", current_balance: 100 },
        { id: "savings", current_balance: 20 },
      ],
      [
        recurring({
          id: "move",
          rule_kind: "transfer",
          expense_kind: null,
          amount: 20,
          destination_account_id: "savings",
        }),
      ],
      "2026-07-01",
      "2026-07-31",
    );
    expect(transferOnly.reduce((sum, account) => sum + account.change, 0)).toBe(
      0,
    );
  });
});
