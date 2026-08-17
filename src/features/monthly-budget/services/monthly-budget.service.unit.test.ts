jest.mock("@/repositories/monthly-budget.repository", () => ({
  monthlyBudgetRepository: {},
}));

jest.mock("@/repositories/transactions.repository", () => ({
  transactionsRepository: {},
}));

jest.mock("@/shared/lib/supabase/client", () => ({
  supabase: {},
}));

import { MonthlyBudgetService, distributeEqualSplit, type MonthlyBudgetRuleDraft } from "./monthly-budget.service";
import { monthlyBudgetRepository } from "@/repositories/monthly-budget.repository";
import { supabase } from "@/shared/lib/supabase/client";

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

function allocation(overrides: Record<string, unknown> = {}) {
  return {
    id: `allocation-${Math.random().toString(36).slice(2, 8)}`,
    rule_id: "rule-1",
    destination_account_id: "savings-1",
    amount: 500,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as any;
}

/**
 * `destination_account_id` is accepted as shorthand for "this rule has a
 * single allocation to this account" so most existing single-destination
 * fixtures barely need to change under the multi-allocation schema — only
 * tests that actually exercise multiple destinations build `allocations`
 * explicitly.
 */
function rule(overrides: Record<string, unknown> = {}) {
  const { allocations, amount, destination_account_id, ...rest } = overrides as Record<string, unknown> & {
    allocations?: unknown[];
    amount?: number;
    destination_account_id?: string;
  };
  const totalAmount = amount ?? 500;
  const resolvedAllocations =
    allocations ??
    [allocation({ destination_account_id: destination_account_id ?? "savings-1", amount: totalAmount })];

  return {
    id: "rule-1",
    budget_config_id: "config-1",
    name: "Monthly saving",
    section: "savings",
    source_account_id: "cash-1",
    owner_member_id: member.userId,
    amount: totalAmount,
    allocation_mode: "equal_split",
    frequency: "monthly",
    priority: 0,
    is_active: true,
    active_months: [],
    active_from_month: null,
    active_to_month: null,
    created_at: "2026-01-01T00:00:00.000Z",
    allocations: resolvedAllocations,
    ...rest,
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
        categoryId: null,
      }),
    ]);
  });

  it("carries an allocation's category onto its generated transfer, and defaults to null when unset", () => {
    const result = preview({
      rules: [
        rule({
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 300, category_id: "cat-investments" }),
            allocation({ id: "allocation-2", destination_account_id: "savings-2", amount: 200, category_id: null }),
          ],
          amount: 500,
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "Savings", type: "savings", current_balance: 0 }),
        account({ id: "savings-2", name: "PPR", type: "ppr", current_balance: 0 }),
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.transfers).toEqual([
      expect.objectContaining({ destinationAccountId: "savings-1", amount: 300, categoryId: "cat-investments" }),
      expect.objectContaining({ destinationAccountId: "savings-2", amount: 200, categoryId: null }),
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

  it("reports a rule whose source account does not exist", () => {
    const result = preview({
      rules: [rule({ source_account_id: "missing-account" })],
    });

    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" has no valid source account.',
    ]);
    expect(result.transfers).toEqual([]);
  });

  it("reports a rule with no destination accounts at all", () => {
    const result = preview({
      rules: [rule({ allocations: [] })],
    });

    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" needs at least one destination account.',
    ]);
    expect(result.transfers).toEqual([]);
  });

  it("reports an allocation whose destination account does not exist", () => {
    const result = preview({
      rules: [
        rule({
          allocations: [allocation({ destination_account_id: "missing-account", amount: 500 })],
        }),
      ],
    });

    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" has an allocation with no valid destination account.',
    ]);
    expect(result.transfers).toEqual([]);
  });

  it("splits a rule equally across multiple destination accounts", () => {
    const result = preview({
      rules: [
        rule({
          amount: 200,
          allocation_mode: "equal_split",
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 50, sort_order: 0 }),
            allocation({ destination_account_id: "savings-2", amount: 50, sort_order: 1 }),
            allocation({ destination_account_id: "savings-3", amount: 50, sort_order: 2 }),
            allocation({ destination_account_id: "savings-4", amount: 50, sort_order: 3 }),
          ],
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "S1", type: "savings" }),
        account({ id: "savings-2", name: "S2", type: "savings" }),
        account({ id: "savings-3", name: "S3", type: "savings" }),
        account({ id: "savings-4", name: "S4", type: "savings" }),
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.configuredTotal).toBe(200);
    expect(result.transfers).toHaveLength(4);
    expect(result.transfers.every((transfer) => transfer.amount === 50)).toBe(true);
    expect(new Set(result.transfers.map((transfer) => transfer.destinationAccountId))).toEqual(
      new Set(["savings-1", "savings-2", "savings-3", "savings-4"]),
    );
    expect(result.transfers.every((transfer) => transfer.generatedByRuleId === "rule-1")).toBe(true);
  });

  it("supports custom per-account amounts that differ per destination", () => {
    const result = preview({
      rules: [
        rule({
          amount: 200,
          allocation_mode: "custom",
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 100, sort_order: 0 }),
            allocation({ destination_account_id: "savings-2", amount: 40, sort_order: 1 }),
            allocation({ destination_account_id: "savings-3", amount: 60, sort_order: 2 }),
          ],
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "S1", type: "savings" }),
        account({ id: "savings-2", name: "S2", type: "savings" }),
        account({ id: "savings-3", name: "S3", type: "savings" }),
      ],
    });

    expect(result.validationIssues).toEqual([]);
    expect(result.configuredTotal).toBe(200);
    expect(result.transfers.map((transfer) => transfer.amount).sort((a, b) => a - b)).toEqual([40, 60, 100]);
  });

  it("reports an underallocated custom rule and drops its transfers", () => {
    const result = preview({
      rules: [
        rule({
          amount: 200,
          allocation_mode: "custom",
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 100, sort_order: 0 }),
            allocation({ destination_account_id: "savings-2", amount: 70, sort_order: 1 }),
          ],
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "S1", type: "savings" }),
        account({ id: "savings-2", name: "S2", type: "savings" }),
      ],
    });

    expect(result.transfers).toEqual([]);
    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" allocations (170) are short of its total (200) by 30.',
    ]);
  });

  it("reports an overallocated custom rule and drops its transfers", () => {
    const result = preview({
      rules: [
        rule({
          amount: 200,
          allocation_mode: "custom",
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 120, sort_order: 0 }),
            allocation({ destination_account_id: "savings-2", amount: 100, sort_order: 1 }),
          ],
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "S1", type: "savings" }),
        account({ id: "savings-2", name: "S2", type: "savings" }),
      ],
    });

    expect(result.transfers).toEqual([]);
    expect(result.validationIssues).toEqual([
      'Rule "Monthly saving" allocations (220) exceed its total (200) by 20.',
    ]);
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
          allocationId: "allocation-1",
          title: "Monthly saving",
          section: "savings",
          sourceAccountId: "cash-1",
          destinationAccountId: "savings-1",
          destinationPotId: "pot-1",
          destinationKind: "pot",
          amount: 500,
          generatedByRuleId: "rule-1",
          isSystemGenerated: false,
          categoryId: null,
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

  it("confirms a rule that fans out to multiple destination accounts as a single atomic call", async () => {
    const expectedRun = { id: "run-1", status: "confirmed" };
    Object.assign(monthlyBudgetRepository, {
      confirmRunAtomically: jest.fn().mockResolvedValue({
        data: expectedRun,
        error: null,
      }),
    });
    const runPreview = preview({
      recurringTransactions: [],
      incomeInputs: [{ memberId: member.userId, cashAccountId: "cash-1", amount: "3000" }],
      rules: [
        rule({
          amount: 200,
          allocations: [
            allocation({ destination_account_id: "savings-1", amount: 50, sort_order: 0 }),
            allocation({ destination_account_id: "savings-2", amount: 50, sort_order: 1 }),
            allocation({ destination_account_id: "savings-3", amount: 50, sort_order: 2 }),
            allocation({ destination_account_id: "savings-4", amount: 50, sort_order: 3 }),
          ],
        }),
      ],
      accounts: [
        account({ id: "cash-1", name: "Main cash", type: "bank", current_balance: 500 }),
        account({ id: "savings-1", name: "S1", type: "savings" }),
        account({ id: "savings-2", name: "S2", type: "savings" }),
        account({ id: "savings-3", name: "S3", type: "savings" }),
        account({ id: "savings-4", name: "S4", type: "savings" }),
      ],
    });

    expect(runPreview.transfers).toHaveLength(4);

    await expect(service.confirmRun({ runId: "run-1", preview: runPreview })).resolves.toBe(expectedRun);
    expect(monthlyBudgetRepository.confirmRunAtomically).toHaveBeenCalledTimes(1);
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

  it("counts multi-account rule allocations into bank accounts as allocations outside remaining cash", () => {
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

describe("distributeEqualSplit", () => {
  it("distributes the remainder cent-by-cent so the shares always sum exactly to the total", () => {
    expect(distributeEqualSplit(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(distributeEqualSplit(50, 4)).toEqual([12.5, 12.5, 12.5, 12.5]);
    expect(distributeEqualSplit(0.01, 3)).toEqual([0.01, 0, 0]);
    expect(distributeEqualSplit(10, 1)).toEqual([10]);
  });

  it("never drifts from the original total, for arbitrary totals and account counts", () => {
    const cases: Array<[number, number]> = [
      [199.99, 7],
      [0.03, 4],
      [1234.56, 12],
      [165, 2],
      [50, 4],
    ];

    for (const [total, count] of cases) {
      const shares = distributeEqualSplit(total, count);
      expect(shares).toHaveLength(count);
      const sum = Math.round(shares.reduce((acc, share) => acc + share, 0) * 100) / 100;
      expect(sum).toBe(total);
    }
  });
});

describe("MonthlyBudgetService.saveConfiguration", () => {
  function ruleDraft(overrides: Partial<MonthlyBudgetRuleDraft> = {}): MonthlyBudgetRuleDraft {
    return {
      id: "draft-rule-1",
      name: "Investments",
      section: "investments",
      sourceAccountId: "cash-1",
      amount: "200",
      allocationMode: "equal_split",
      allocations: [
        { id: "a1", destinationAccountId: "xtb", amount: "0", categoryId: null },
        { id: "a2", destinationAccountId: "trading212", amount: "0", categoryId: null },
        { id: "a3", destinationAccountId: "trade-republic", amount: "0", categoryId: null },
        { id: "a4", destinationAccountId: "ppr-account", amount: "0", categoryId: null },
      ],
      ownerMemberId: null,
      priority: "0",
      isActive: true,
      activeMonths: [],
      activeFromMonth: "",
      activeToMonth: "",
      ...overrides,
    };
  }

  function saveInput(rules: MonthlyBudgetRuleDraft[]) {
    return {
      householdId: "household-1",
      configId: null,
      name: "Household budget",
      incomeMode: "shared" as const,
      remainingCashStrategy: "keep" as const,
      fixedRemainingCashAmount: 0,
      excessCashDistributionMethod: "even_split" as const,
      rules,
    };
  }

  it("rejects a rule with no destination accounts", async () => {
    await expect(
      service.saveConfiguration(saveInput([ruleDraft({ allocations: [] })])),
    ).rejects.toThrow('Rule "Investments" needs at least one destination account.');
  });

  it("rejects a destination account that matches the source account", async () => {
    await expect(
      service.saveConfiguration(saveInput([
        ruleDraft({ allocations: [{ id: "a1", destinationAccountId: "cash-1", amount: "200", categoryId: null }] }),
      ])),
    ).rejects.toThrow('Rule "Investments" cannot use the same source and destination account.');
  });

  it("rejects the same destination account used twice in one rule", async () => {
    await expect(
      service.saveConfiguration(saveInput([
        ruleDraft({
          allocations: [
            { id: "a1", destinationAccountId: "xtb", amount: "100", categoryId: null },
            { id: "a2", destinationAccountId: "xtb", amount: "100", categoryId: null },
          ],
        }),
      ])),
    ).rejects.toThrow('Rule "Investments" cannot use the same destination account twice.');
  });

  it("rejects a custom allocation whose amounts do not add up to the rule total", async () => {
    await expect(
      service.saveConfiguration(saveInput([
        ruleDraft({
          allocationMode: "custom",
          allocations: [
            { id: "a1", destinationAccountId: "xtb", amount: "100", categoryId: null },
            { id: "a2", destinationAccountId: "trading212", amount: "40", categoryId: null },
          ],
        }),
      ])),
    ).rejects.toThrow('Rule "Investments" allocations (140) must add up to its total (200).');
  });

  it("recomputes equal-split allocation amounts server-side, ignoring stale drafted amounts", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "config-1", error: null });
    const single = jest.fn().mockResolvedValue({ data: { id: "household-1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    Object.assign(supabase as any, { rpc, from });
    Object.assign(monthlyBudgetRepository, {
      getActiveConfigWithRules: jest.fn().mockResolvedValue({
        data: { id: "config-1", rules: [] },
        error: null,
      }),
    });

    await service.saveConfiguration(saveInput([
      ruleDraft({
        allocations: [
          { id: "a1", destinationAccountId: "xtb", amount: "999", categoryId: null },
          { id: "a2", destinationAccountId: "trading212", amount: "1", categoryId: null },
          { id: "a3", destinationAccountId: "trade-republic", amount: "0", categoryId: null },
          { id: "a4", destinationAccountId: "ppr-account", amount: "0", categoryId: null },
        ],
      }),
    ]));

    expect(rpc).toHaveBeenCalledWith(
      "save_monthly_budget_configuration",
      expect.objectContaining({
        p_rules: [
          expect.objectContaining({
            amount: 200,
            allocation_mode: "equal_split",
            allocations: [
              { destination_account_id: "xtb", amount: 50, category_id: null },
              { destination_account_id: "trading212", amount: 50, category_id: null },
              { destination_account_id: "trade-republic", amount: 50, category_id: null },
              { destination_account_id: "ppr-account", amount: 50, category_id: null },
            ],
          }),
        ],
      }),
    );
  });

  it("carries each allocation's optional category through to the save payload", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "config-1", error: null });
    const single = jest.fn().mockResolvedValue({ data: { id: "household-1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    Object.assign(supabase as any, { rpc, from });
    Object.assign(monthlyBudgetRepository, {
      getActiveConfigWithRules: jest.fn().mockResolvedValue({
        data: { id: "config-1", rules: [] },
        error: null,
      }),
    });

    await service.saveConfiguration(saveInput([
      ruleDraft({
        allocationMode: "custom",
        allocations: [
          { id: "a1", destinationAccountId: "xtb", amount: "150", categoryId: "cat-investments" },
          { id: "a2", destinationAccountId: "ppr-account", amount: "50", categoryId: null },
        ],
      }),
    ]));

    expect(rpc).toHaveBeenCalledWith(
      "save_monthly_budget_configuration",
      expect.objectContaining({
        p_rules: [
          expect.objectContaining({
            allocations: [
              { destination_account_id: "xtb", amount: 150, category_id: "cat-investments" },
              { destination_account_id: "ppr-account", amount: 50, category_id: null },
            ],
          }),
        ],
      }),
    );
  });

  it("sends custom amounts as entered once they have been validated", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: "config-1", error: null });
    const single = jest.fn().mockResolvedValue({ data: { id: "household-1" }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    Object.assign(supabase as any, { rpc, from });
    Object.assign(monthlyBudgetRepository, {
      getActiveConfigWithRules: jest.fn().mockResolvedValue({
        data: { id: "config-1", rules: [] },
        error: null,
      }),
    });

    await service.saveConfiguration(saveInput([
      ruleDraft({
        allocationMode: "custom",
        allocations: [
          { id: "a1", destinationAccountId: "xtb", amount: "50", categoryId: null },
          { id: "a2", destinationAccountId: "trading212", amount: "50", categoryId: null },
          { id: "a3", destinationAccountId: "trade-republic", amount: "75", categoryId: null },
          { id: "a4", destinationAccountId: "ppr-account", amount: "25", categoryId: null },
        ],
      }),
    ]));

    expect(rpc).toHaveBeenCalledWith(
      "save_monthly_budget_configuration",
      expect.objectContaining({
        p_rules: [
          expect.objectContaining({
            amount: 200,
            allocation_mode: "custom",
            allocations: [
              { destination_account_id: "xtb", amount: 50, category_id: null },
              { destination_account_id: "trading212", amount: 50, category_id: null },
              { destination_account_id: "trade-republic", amount: 75, category_id: null },
              { destination_account_id: "ppr-account", amount: 25, category_id: null },
            ],
          }),
        ],
      }),
    );
  });
});
