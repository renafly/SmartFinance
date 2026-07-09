jest.mock("@/repositories/monthly-budget.repository", () => ({
  monthlyBudgetRepository: {},
}));

jest.mock("@/repositories/transactions.repository", () => ({
  transactionsRepository: {},
}));

jest.mock("@/shared/lib/supabase/client", () => ({
  supabase: {},
}));

import { MonthlyBudgetService } from "./monthly-budget.service";

const service = new MonthlyBudgetService();

const member = {
  userId: "member-1",
  fullName: "Alex Finance",
  email: "alex@example.com",
  status: "accepted" as const,
};

function account(overrides: Record<string, unknown>) {
  return {
    id: "cash-1",
    name: "Main cash",
    type: "bank",
    current_balance: 0,
    owner_profile_id: member.userId,
    ...overrides,
  } as any;
}

function rule(overrides: Record<string, unknown>) {
  return {
    id: "rule-1",
    budget_config_id: "config-1",
    name: "Monthly saving",
    section: "savings",
    source_account_id: "cash-1",
    destination_account_id: "savings-1",
    destination_pot_id: null,
    owner_member_id: member.userId,
    amount: 500,
    frequency: "monthly",
    priority: 0,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as any;
}

function recurring(overrides: Record<string, unknown>) {
  return {
    id: "recurring-1",
    household_id: "household-1",
    account_id: "cash-1",
    category_id: null,
    title: "Subscription",
    amount: 100,
    type: "expense",
    frequency: "monthly",
    next_run: "2026-07-01",
    excluded_months: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as any;
}

function preview(overrides: Partial<Parameters<MonthlyBudgetService["buildPreview"]>[0]> = {}) {
  return service.buildPreview({
    settings: {
      income_mode: "shared",
      remaining_cash_strategy: "keep",
      fixed_remaining_cash_amount: 0,
      excess_cash_distribution_method: "even_split",
    },
    rules: [rule({})],
    members: [member],
    accounts: [
      account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
      account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
    ],
    savingPots: [],
    savingPotAccountAssignments: [],
    incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "3000" }],
    recurringTransactions: [recurring({})],
    month: "2026-07",
    ...overrides,
  });
}

describe("MonthlyBudgetService.buildPreview", () => {
  it("builds totals from valid salary, recurring rules, and budget transfers", () => {
    const result = preview();

    expect(result.validationIssues).toEqual([]);
    expect(result).toMatchObject({
      month: "2026-07",
      incomeTotal: 3000,
      recurringNetTotal: -100,
      configuredTotal: 500,
      remainingCash: 2900,
      excessCash: 0,
      sectionTotals: { savings: 500 },
      memberTotals: { [member.userId]: 3000 },
    });
    expect(result.transfers).toEqual([
      expect.objectContaining({
        ruleId: "rule-1",
        title: "Monthly saving",
        sourceAccountId: "cash-1",
        destinationAccountId: "savings-1",
        amount: 500,
        isSystemGenerated: false,
      }),
    ]);
  });

  it("excludes custom recurring transactions during excluded months", () => {
    const result = preview({
      rules: [],
      accounts: [account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 })],
      recurringTransactions: [
        recurring({
          amount: 250,
          frequency: "custom",
          excluded_months: [7],
        }),
      ],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "1000" }],
      month: "2026-07",
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.recurringNetTotal).toBe(0);
    expect(result.remainingCash).toBe(1000);
    expect(result.transfers).toEqual([]);
  });

  it("distributes fixed remaining cash excess to eligible savings accounts", () => {
    const result = preview({
      settings: {
        income_mode: "shared",
        remaining_cash_strategy: "fixed",
        fixed_remaining_cash_amount: 500,
        excess_cash_distribution_method: "even_split",
      },
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "1000" }],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
      ],
      rules: [rule({ amount: 100 })],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.remainingCash).toBe(500);
    expect(result.excessCash).toBe(0);
    expect(result.configuredTotal).toBe(100);
    expect(result.sectionTotals).toEqual({ savings: 100, remaining_cash: 400 });
    expect(result.transfers).toEqual([
      expect.objectContaining({ title: "Monthly saving", amount: 100, isSystemGenerated: false }),
      expect.objectContaining({
        title: "Remaining cash distribution",
        section: "remaining_cash",
        sourceAccountId: "cash-1",
        destinationAccountId: "savings-1",
        amount: 400,
        isSystemGenerated: true,
      }),
    ]);
  });

  it("reports insufficient cash when configured transfers exceed salary", () => {
    const result = preview({
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "100" }],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
      ],
      rules: [rule({ amount: 200 })],
    });

    expect(result.validationIssues).toEqual([
      'Main cash does not have enough available cash for "Monthly saving".',
      "The monthly budget leaves a cash account below zero.",
    ]);
    expect(result.remainingCash).toBe(-100);
  });

  it("reports missing salary inputs for accepted members", () => {
    const result = preview({
      rules: [],
      recurringTransactions: [],
      incomeInputs: [],
    });

    expect(result.validationIssues).toEqual(["Alex Finance is missing a monthly salary input."]);
    expect(result.incomeTotal).toBe(0);
    expect(result.memberTotals).toEqual({ [member.userId]: 0 });
  });
});
