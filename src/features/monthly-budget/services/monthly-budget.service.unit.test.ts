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
import { monthlyBudgetRepository } from "@/repositories/monthly-budget.repository";

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
    active_months: [],
    active_from_month: null,
    active_to_month: null,
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
      remainingCash: 2400,
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

  it("skips monthly budget rules outside the selected active months", () => {
    const result = preview({
      rules: [
        rule({
          active_months: [1, 2],
        }),
      ],
      month: "2026-07",
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.configuredTotal).toBe(0);
    expect(result.transfers).toEqual([]);
  });

  it("honors active month ranges when building the preview", () => {
    const result = preview({
      rules: [
        rule({
          active_from_month: 5,
          active_to_month: 9,
        }),
      ],
      month: "2026-07",
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.configuredTotal).toBe(500);
    expect(result.transfers).toHaveLength(1);
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

  it("does not treat recurring transfers as household income or expenses", () => {
    const result = preview({
      rules: [],
      recurringTransactions: [
        recurring({
          rule_kind: "transfer",
          destination_account_id: "savings-1",
          amount: 250,
        }),
      ],
    });

    expect(result.recurringNetTotal).toBe(0);
    expect(result.remainingCash).toBe(3000);
  });

  it("requires a concrete destination account instead of resolving a pig bank", () => {
    const result = preview({
      rules: [
        rule({
          destination_account_id: null,
          destination_pot_id: "pot-1",
        }),
      ],
      savingPots: [{ id: "pot-1", name: "House", household_id: "household-1" } as any],
      savingPotAccountAssignments: [
        { pot_id: "pot-1", account_id: "savings-1" } as any,
      ],
    });

    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" has no valid destination account.',
    ]);
    expect(result.transfers).toEqual([]);
  });

  it("creates an account-only preview even when legacy pot data is present", () => {
    const result = preview({
      rules: [
        rule({
          destination_account_id: "savings-1",
          destination_pot_id: "pot-1",
        }),
      ],
      savingPots: [{ id: "pot-1", name: "House", household_id: "household-1" } as any],
      savingPotAccountAssignments: [
        { pot_id: "pot-1", account_id: "cash-1" } as any,
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.transfers).toEqual([
      expect.objectContaining({
        sourceAccountId: "cash-1",
        destinationAccountId: "savings-1",
        destinationPotId: null,
        destinationKind: "account",
      }),
    ]);
  });

  it("reports a rule whose source account does not exist", () => {
    const result = preview({
      rules: [rule({ source_account_id: "missing-account" })],
    });

    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" has no valid source account.',
    ]);
    expect(result.transfers).toEqual([]);
  });

  it("rejects confirmation of a preview with a legacy pig bank transfer", async () => {
    Object.assign(monthlyBudgetRepository, {
      listRuns: jest.fn().mockResolvedValue({
        data: [{ id: "run-1", status: "draft" }],
        error: null,
      }),
    });

    await expect(service.confirmRun({
      runId: "run-1",
      preview: {
        ...preview(),
        validationIssues: [],
        transfers: [{
          ruleId: "rule-1",
          title: "Monthly saving",
          section: "savings",
          sourceAccountId: "cash-1",
          destinationAccountId: "savings-1",
          destinationPotId: "pot-1",
          destinationKind: "pot",
          amount: 500,
          generatedByRuleId: "rule-1",
          isSystemGenerated: false,
        }],
      },
    })).rejects.toThrow('Budget transfer "Monthly saving" must use two different valid accounts.');
  });

  it("confirms wages and allocations through one atomic repository call", async () => {
    const expectedRun = { id: "run-1", status: "confirmed" };
    Object.assign(monthlyBudgetRepository, {
      confirmRunAtomically: jest.fn().mockResolvedValue({
        data: expectedRun,
        error: null,
      }),
    });
    const runPreview = preview({
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "2600" }],
    });

    await expect(service.confirmRun({
      runId: "run-1",
      preview: runPreview,
    })).resolves.toBe(expectedRun);
    expect(monthlyBudgetRepository.confirmRunAtomically).toHaveBeenCalledWith(
      "run-1",
      runPreview.transfers,
      runPreview,
    );
  });

  it("deletes only the transactions linked to a monthly budget run", async () => {
    Object.assign(monthlyBudgetRepository, {
      deleteRunTransactions: jest.fn().mockResolvedValue({ data: 6, error: null }),
    });

    await expect(service.deleteRunTransactions("run-1")).resolves.toBe(6);
    expect(monthlyBudgetRepository.deleteRunTransactions).toHaveBeenCalledWith("run-1");
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

  it("distributes only cash above the fixed target after configured savings transfers", () => {
    const result = preview({
      settings: {
        income_mode: "shared",
        remaining_cash_strategy: "fixed",
        fixed_remaining_cash_amount: 1100,
        excess_cash_distribution_method: "even_split",
      },
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "2552" }],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 }),
        account({ id: "savings-1", name: "Savings A", type: "savings", current_balance: 0 }),
        account({ id: "savings-2", name: "Savings B", type: "savings", current_balance: 0 }),
      ],
      rules: [
        rule({ id: "rule-a", destination_account_id: "savings-1", amount: 650 }),
        rule({ id: "rule-b", destination_account_id: "savings-2", amount: 350, priority: 1 }),
      ],
    });

    const configuredSavings = result.transfers
      .filter((transfer) => !transfer.isSystemGenerated)
      .reduce((total, transfer) => total + transfer.amount, 0);
    const generatedRemainingCash = result.transfers
      .filter((transfer) => transfer.isSystemGenerated)
      .reduce((total, transfer) => total + transfer.amount, 0);

    expect(result.validationIssues).toEqual([]);
    const savingsATotal = result.transfers
      .filter((transfer) => transfer.destinationAccountId === "savings-1")
      .reduce((total, transfer) => total + transfer.amount, 0);

    expect(configuredSavings).toBe(1000);
    expect(generatedRemainingCash).toBe(452);
    expect(savingsATotal).toBe(876);
    expect(configuredSavings + generatedRemainingCash).toBe(1452);
    expect(result.configuredTotal).toBe(1000);
    expect(result.sectionTotals).toEqual({ savings: 1000, remaining_cash: 452 });
    expect(result.remainingCash).toBe(1100);
    expect(result.excessCash).toBe(0);
  });

  it("does not redistribute cash retained in an account from a previous month", () => {
    const result = preview({
      settings: {
        income_mode: "shared",
        remaining_cash_strategy: "fixed",
        fixed_remaining_cash_amount: 1100,
        excess_cash_distribution_method: "even_split",
      },
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "2202" }],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 1100 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 9000 }),
      ],
      rules: [rule({ amount: 650 })],
    });

    const generatedRemainingCash = result.transfers
      .filter((transfer) => transfer.isSystemGenerated)
      .reduce((total, transfer) => total + transfer.amount, 0);

    expect(result.validationIssues).toEqual([]);
    expect(result.incomeTotal).toBe(2202);
    expect(result.configuredTotal).toBe(650);
    expect(generatedRemainingCash).toBe(452);
    expect(result.remainingCash).toBe(1100);
  });

  it("counts pot transfers into bank accounts as allocations outside remaining cash", () => {
    const savingsRules = ["savings-1", "savings-2", "savings-3", "savings-4"].map((destinationId, index) =>
      rule({ id: `savings-rule-${index}`, destination_account_id: destinationId, amount: 650, priority: index }),
    );
    const investmentRules = ["investment-1", "investment-2", "investment-3", "investment-4"].map((destinationId, index) =>
      rule({
        id: `investment-rule-${index}`,
        section: "investments",
        destination_account_id: destinationId,
        amount: 50,
        priority: savingsRules.length + index,
      }),
    );
    const potAmounts = [200, 50, 50, 114, 50];
    const potRules = potAmounts.map((amount, index) =>
      rule({
        id: `pot-rule-${index}`,
        section: "pots",
        destination_account_id: `pot-bank-${index}`,
        amount,
        priority: savingsRules.length + investmentRules.length + index,
      }),
    );
    const result = preview({
      settings: {
        income_mode: "shared",
        remaining_cash_strategy: "fixed",
        fixed_remaining_cash_amount: 1100,
        excess_cash_distribution_method: "even_split",
      },
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "4695" }],
      accounts: [
        account({ id: "cash-1", name: "Salary account", type: "bank" }),
        ...["savings-1", "savings-2", "savings-3", "savings-4"].map((id) => account({ id, name: id, type: "savings" })),
        ...["investment-1", "investment-2", "investment-3", "investment-4"].map((id) => account({ id, name: id, type: "investment" })),
        ...potAmounts.map((_, index) => account({ id: `pot-bank-${index}`, name: `Pot ${index}`, type: "bank" })),
      ],
      rules: [...savingsRules, ...investmentRules, ...potRules],
    });

    const generatedTransfers = result.transfers.filter((transfer) => transfer.isSystemGenerated);

    expect(result.validationIssues).toEqual([]);
    expect(result.configuredTotal).toBe(3264);
    expect(result.sectionTotals).toEqual({ savings: 2600, investments: 200, pots: 464, remaining_cash: 331 });
    expect(generatedTransfers).toHaveLength(4);
    expect(generatedTransfers.map((transfer) => transfer.amount)).toEqual([82.75, 82.75, 82.75, 82.75]);
    expect(result.remainingCash).toBe(1100);
  });

  it("adds wages before allocations and keeps fixed cash split across wage accounts", () => {
    const secondMember = {
      userId: "member-2",
      fullName: "Sam Finance",
      email: "sam@example.com",
      status: "accepted" as const,
    };
    const result = preview({
      settings: {
        income_mode: "shared",
        remaining_cash_strategy: "fixed",
        fixed_remaining_cash_amount: 1000,
        excess_cash_distribution_method: "even_split",
      },
      members: [member, secondMember],
      accounts: [
        account({ id: "cash-a", name: "Account A", current_balance: 0 }),
        account({ id: "cash-b", name: "Account B", current_balance: 0, owner_profile_id: secondMember.userId }),
        account({ id: "savings-a", name: "Savings A", type: "savings", current_balance: 0 }),
        account({ id: "savings-b", name: "Savings B", type: "savings", current_balance: 0, owner_profile_id: secondMember.userId }),
      ],
      incomeInputs: [
        { memberId: member.userId, cashAccountId: "cash-a", amount: "2600" },
        { memberId: secondMember.userId, cashAccountId: "cash-b", amount: "2000" },
      ],
      recurringTransactions: [],
      rules: [
        rule({ id: "rule-a", source_account_id: "cash-a", destination_account_id: "savings-a", amount: 500 }),
        rule({
          id: "rule-b",
          source_account_id: "cash-b",
          destination_account_id: "savings-b",
          owner_member_id: secondMember.userId,
          amount: 500,
          priority: 1,
        }),
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result).toMatchObject({
      incomeTotal: 4600,
      configuredTotal: 1000,
      remainingCash: 1000,
      excessCash: 0,
      memberTotals: { [member.userId]: 2600, [secondMember.userId]: 2000 },
    });
    const generatedBySource = result.transfers
      .filter((transfer) => transfer.isSystemGenerated)
      .reduce<Record<string, number>>((totals, transfer) => {
        totals[transfer.sourceAccountId] = (totals[transfer.sourceAccountId] ?? 0) + transfer.amount;
        return totals;
      }, {});
    expect(generatedBySource).toEqual({ "cash-a": 1600, "cash-b": 1000 });
  });

  it("keeps each wage account's remaining cash when fixed cash is disabled", () => {
    const secondMember = {
      userId: "member-2",
      fullName: "Sam Finance",
      email: "sam@example.com",
      status: "accepted" as const,
    };
    const result = preview({
      members: [member, secondMember],
      accounts: [
        account({ id: "cash-a", name: "Account A", current_balance: 0 }),
        account({ id: "cash-b", name: "Account B", current_balance: 0, owner_profile_id: secondMember.userId }),
        account({ id: "savings-a", name: "Savings A", type: "savings", current_balance: 0 }),
        account({ id: "savings-b", name: "Savings B", type: "savings", current_balance: 0, owner_profile_id: secondMember.userId }),
      ],
      incomeInputs: [
        { memberId: member.userId, cashAccountId: "cash-a", amount: "2000" },
        { memberId: secondMember.userId, cashAccountId: "cash-b", amount: "2000" },
      ],
      recurringTransactions: [],
      rules: [
        rule({ id: "rule-a", source_account_id: "cash-a", destination_account_id: "savings-a", amount: 500 }),
        rule({ id: "rule-b", source_account_id: "cash-b", destination_account_id: "savings-b", amount: 500, priority: 1 }),
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.incomeTotal).toBe(4000);
    expect(result.remainingCash).toBe(3000);
    expect(result.transfers).toHaveLength(2);
    expect(result.transfers.every((transfer) => !transfer.isSystemGenerated)).toBe(true);
  });

  it("does not make a wage available to allocations until its selected month", () => {
    const deferred = preview({
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
      ],
      recurringTransactions: [],
      incomeInputs: [{
        memberId: member.userId,
        cashAccountId: "cash-1",
        amount: "2000",
        availableMonth: "2026-08",
      }],
      month: "2026-07",
    });
    const available = preview({
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 0 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
      ],
      recurringTransactions: [],
      incomeInputs: [{
        memberId: member.userId,
        cashAccountId: "cash-1",
        amount: "2000",
        availableMonth: "2026-08",
      }],
      month: "2026-08",
    });

    expect(deferred.incomeTotal).toBe(0);
    expect(deferred.memberTotals).toEqual({ [member.userId]: 0 });
    expect(deferred.validationIssues).toEqual([
      'Main cash does not have enough available cash for "Monthly saving".',
      "The monthly budget leaves a cash account below zero.",
    ]);
    expect(available.incomeTotal).toBe(2000);
    expect(available.remainingCash).toBe(1500);
    expect(available.validationIssues).toEqual([]);
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
