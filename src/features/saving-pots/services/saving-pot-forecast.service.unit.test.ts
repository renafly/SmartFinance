import { buildSavingPotForecasts } from "./saving-pot-forecast.service";

const asOf = new Date(Date.UTC(2026, 6, 1));

function forecast(overrides: Partial<Parameters<typeof buildSavingPotForecasts>[0]> = {}) {
  return buildSavingPotForecasts({
    pots: [{ id: "pot-1", targetAmount: 1_000, currentAmount: 100 }],
    recurringTransfers: [],
    monthlyBudgetRules: [],
    asOf,
    ...overrides,
  }).get("pot-1")!;
}

describe("buildSavingPotForecasts", () => {
  it("counts active recurring transfers whose destination account belongs to the pot", () => {
    const result = forecast({
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 150,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
        {
          id: "transaction-1",
          rule_kind: "transaction",
          account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 900,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
        {
          id: "other-pot",
          rule_kind: "transfer",
          account_id: "cash-1",
          destination_account_id: "other-pot-account",
          amount: 900,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
      savingPotAccountAssignments: [
        { pot_id: "pot-1", account_id: "pot-account-1" },
        { pot_id: "pot-2", account_id: "other-pot-account" },
      ],
    });

    expect(result.monthlyContribution).toBe(150);
    expect(result.sources).toEqual([
      { kind: "recurring_transfer", monthlyContribution: 150, contributionCount: 1 },
    ]);
    expect(result.completionDate).toBe("2026-12-10");
  });

  it("combines account-destination recurring transfers with active monthly budget rules", () => {
    const result = forecast({
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 100,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
      monthlyBudgetRules: [
        {
          id: "budget-1",
          source_account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 200,
          frequency: "monthly",
          created_at: "2026-07-05T00:00:00.000Z",
          is_active: true,
        },
        {
          id: "inactive",
          source_account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 800,
          frequency: "monthly",
          created_at: "2026-07-05T00:00:00.000Z",
          is_active: false,
        },
      ],
      savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "pot-account-1" }],
    });

    expect(result.monthlyContribution).toBe(300);
    expect(result.sources).toEqual([
      { kind: "recurring_transfer", monthlyContribution: 100, contributionCount: 1 },
      { kind: "monthly_budget", monthlyContribution: 200, contributionCount: 1 },
    ]);
    expect(result.completionDate).toBe("2026-09-10");
  });

  it("counts a budget rule whenever its destination account belongs to the pot", () => {
    const result = forecast({
      monthlyBudgetRules: [{
        id: "legacy-pot-rule",
        source_account_id: "cash-1",
        destination_account_id: "pot-account-1",
        amount: 150,
        frequency: "monthly",
        is_active: true,
      }],
      savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "pot-account-1" }],
    });

    expect(result.monthlyContribution).toBe(150);
    expect(result.completionDate).toBe("2026-12-01");
  });

  it("only projects monthly budget rules during their active months", () => {
    const result = forecast({
      pots: [{ id: "pot-1", targetAmount: 200, currentAmount: 0 }],
      monthlyBudgetRules: [{
        id: "seasonal-bonus",
        source_account_id: "cash-1",
        destination_account_id: "pot-account-1",
        amount: 100,
        frequency: "monthly",
        created_at: "2026-07-01T00:00:00.000Z",
        active_months: [6, 12],
        is_active: true,
      }],
      savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "pot-account-1" }],
    });

    expect(result.monthlyContribution).toBeCloseTo(16.67, 2);
    expect(result.completionDate).toBe("2027-06-01");
    expect(result.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ month: "2026-07", contribution: 0, projectedAmount: 0 }),
      expect.objectContaining({ month: "2026-12", contribution: 100, projectedAmount: 100 }),
      expect.objectContaining({ month: "2027-06", contribution: 100, projectedAmount: 200, reachedTarget: true }),
    ]));
  });

  it("skips the current month for a monthly budget rule already confirmed this month", () => {
    const rule = {
      id: "monthly-rule",
      source_account_id: "cash-1",
      destination_account_id: "pot-account-1",
      amount: 200,
      frequency: "monthly" as const,
      created_at: "2026-01-01T00:00:00.000Z",
      is_active: true,
    };
    const savingPotAccountAssignments = [{ pot_id: "pot-1", account_id: "pot-account-1" }];

    // budget_rules has no next_run column, so without being told this
    // month's run was already confirmed, the forecast would otherwise
    // double-count July (the real transfer already happened, plus a
    // forecasted one).
    const stillPending = forecast({
      monthlyBudgetRules: [rule],
      savingPotAccountAssignments,
    });
    expect(stillPending.timeline[0]).toEqual(
      expect.objectContaining({ month: "2026-07", contribution: 200 }),
    );

    const alreadyConfirmed = forecast({
      monthlyBudgetRules: [rule],
      savingPotAccountAssignments,
      confirmedRuleIdsForCurrentMonth: ["monthly-rule"],
    });
    // July's row is dropped entirely (not shown as $0) since that
    // contribution already happened and is already reflected in the pot's
    // current balance — the timeline starts at the next real contribution.
    expect(alreadyConfirmed.timeline[0]).toEqual(
      expect.objectContaining({ month: "2026-08", contribution: 200 }),
    );
  });

  it("does not count a transfer between accounts in the same pot", () => {
    const result = forecast({
      recurringTransfers: [{
        id: "internal-transfer",
        rule_kind: "transfer",
        account_id: "pot-account-1",
        destination_account_id: "pot-account-2",
        amount: 150,
        frequency: "monthly",
        is_active: true,
      }],
      savingPotAccountAssignments: [
        { pot_id: "pot-1", account_id: "pot-account-1" },
        { pot_id: "pot-1", account_id: "pot-account-2" },
      ],
    });

    expect(result.unavailableReason).toBe("no_active_contributions");
  });

  it("does not double count an invalid legacy account assignment", () => {
    const result = forecast({
      recurringTransfers: [{
        id: "ambiguous-transfer",
        rule_kind: "transfer",
        account_id: "cash-1",
        destination_account_id: "shared-pot-account",
        amount: 150,
        frequency: "monthly",
        is_active: true,
      }],
      savingPotAccountAssignments: [
        { pot_id: "pot-1", account_id: "shared-pot-account" },
        { pot_id: "pot-2", account_id: "shared-pot-account" },
      ],
    });

    expect(result.unavailableReason).toBe("no_active_contributions");
  });

  it("retains legacy destination-pot support when an imported rule has no destination account", () => {
    const result = forecast({
      recurringTransfers: [{
        id: "legacy-transfer",
        rule_kind: "transfer",
        destination_pot_id: "pot-1",
        amount: 100,
        frequency: "monthly",
        next_run: "2026-07-10",
        is_active: true,
      }],
    });

    expect(result.monthlyContribution).toBe(100);
  });

  it("honours custom excluded months when projecting recurring transfers", () => {
    const result = forecast({
      pots: [{ id: "pot-1", targetAmount: 400, currentAmount: 0 }],
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          account_id: "cash-1",
          destination_account_id: "pot-account-1",
          amount: 100,
          frequency: "custom",
          excluded_months: [8],
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
      savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "pot-account-1" }],
    });

    expect(result.completionDate).toBe("2026-11-10");
  });

  it("returns localized-state-ready reasons for missing targets and contributions", () => {
    expect(
      forecast({ pots: [{ id: "pot-1", targetAmount: null, currentAmount: 0 }] }).unavailableReason,
    ).toBe("missing_target");
    expect(forecast().unavailableReason).toBe("no_active_contributions");
  });

  describe("multi-account rule allocations", () => {
    // Mirrors the real-world example: an "Investments" rule totalling €200
    // equal-split across four destination accounts, a "Health savings" rule
    // sending €100 to a single account, and a "Holiday pot" rule sending
    // €150 to another — €450/month of planned savings in total, with each
    // destination account's forecast only reflecting *its own* resolved
    // allocation amount, never the parent rule's total.
    const investmentsRule = {
      id: "rule-investments",
      source_account_id: "cash-1",
      amount: 200,
      frequency: "monthly" as const,
      created_at: "2026-07-01T00:00:00.000Z",
      is_active: true,
      allocations: [
        { destination_account_id: "xtb-account", amount: 50 },
        { destination_account_id: "trading212-account", amount: 50 },
        { destination_account_id: "trade-republic-account", amount: 50 },
        { destination_account_id: "ppr-account", amount: 50 },
      ],
    };
    const healthRule = {
      id: "rule-health",
      source_account_id: "cash-1",
      amount: 100,
      frequency: "monthly" as const,
      created_at: "2026-07-01T00:00:00.000Z",
      is_active: true,
      allocations: [{ destination_account_id: "health-account", amount: 100 }],
    };
    const holidayRule = {
      id: "rule-holiday",
      source_account_id: "cash-1",
      amount: 150,
      frequency: "monthly" as const,
      created_at: "2026-07-01T00:00:00.000Z",
      is_active: true,
      allocations: [{ destination_account_id: "holiday-account", amount: 150 }],
    };
    const monthlyBudgetRules = [investmentsRule, healthRule, holidayRule];

    it("attributes each equal_split allocation only to its own destination account's pot, not the rule total", () => {
      const result = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules,
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "xtb-account" }],
      });

      expect(result.monthlyContribution).toBe(50);
      expect(result.sources).toEqual([
        { kind: "monthly_budget", monthlyContribution: 50, contributionCount: 1 },
      ]);
    });

    it("detects the full €450/month across all destination pots, matching the sum of resolved allocations", () => {
      const pots = [
        { id: "pot-xtb", targetAmount: 10_000, currentAmount: 0 },
        { id: "pot-trading212", targetAmount: 10_000, currentAmount: 0 },
        { id: "pot-trade-republic", targetAmount: 10_000, currentAmount: 0 },
        { id: "pot-ppr", targetAmount: 10_000, currentAmount: 0 },
        { id: "pot-health", targetAmount: 10_000, currentAmount: 0 },
        { id: "pot-holiday", targetAmount: 10_000, currentAmount: 0 },
      ];
      const savingPotAccountAssignments = [
        { pot_id: "pot-xtb", account_id: "xtb-account" },
        { pot_id: "pot-trading212", account_id: "trading212-account" },
        { pot_id: "pot-trade-republic", account_id: "trade-republic-account" },
        { pot_id: "pot-ppr", account_id: "ppr-account" },
        { pot_id: "pot-health", account_id: "health-account" },
        { pot_id: "pot-holiday", account_id: "holiday-account" },
      ];

      // The shared `forecast()` helper only returns a single hardcoded pot's
      // entry, so drive the map builder directly to inspect every pot's
      // contribution at once.
      const forecasts = buildSavingPotForecasts({
        pots,
        recurringTransfers: [],
        monthlyBudgetRules,
        savingPotAccountAssignments,
        asOf,
      });

      const total = [...forecasts.values()].reduce((sum, item) => sum + item.monthlyContribution, 0);
      expect(total).toBe(450);
      expect(forecasts.get("pot-xtb")?.monthlyContribution).toBe(50);
      expect(forecasts.get("pot-trading212")?.monthlyContribution).toBe(50);
      expect(forecasts.get("pot-trade-republic")?.monthlyContribution).toBe(50);
      expect(forecasts.get("pot-ppr")?.monthlyContribution).toBe(50);
      expect(forecasts.get("pot-health")?.monthlyContribution).toBe(100);
      expect(forecasts.get("pot-holiday")?.monthlyContribution).toBe(150);
    });

    it("supports custom (uneven) allocations, using the resolved per-account amount", () => {
      const customRule = {
        id: "rule-custom",
        source_account_id: "cash-1",
        amount: 300,
        frequency: "monthly" as const,
        created_at: "2026-07-01T00:00:00.000Z",
        is_active: true,
        allocations: [
          { destination_account_id: "account-a", amount: 120 },
          { destination_account_id: "account-b", amount: 180 },
        ],
      };

      const resultA = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules: [customRule],
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "account-a" }],
      });
      const resultB = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules: [customRule],
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "account-b" }],
      });

      expect(resultA.monthlyContribution).toBe(120);
      expect(resultB.monthlyContribution).toBe(180);
    });

    it("ignores an allocation for an inactive rule, even though other allocations share the same rule", () => {
      const inactiveRule = { ...investmentsRule, id: "rule-inactive", is_active: false };

      const result = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules: [inactiveRule],
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "xtb-account" }],
      });

      expect(result.unavailableReason).toBe("no_active_contributions");
    });

    it("skips only the current month's allocation contribution for a rule already confirmed this month", () => {
      const stillPending = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules: [investmentsRule],
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "xtb-account" }],
      });
      expect(stillPending.timeline[0]).toEqual(
        expect.objectContaining({ month: "2026-07", contribution: 50 }),
      );

      const alreadyConfirmed = forecast({
        pots: [{ id: "pot-1", targetAmount: 10_000, currentAmount: 0 }],
        monthlyBudgetRules: [investmentsRule],
        savingPotAccountAssignments: [{ pot_id: "pot-1", account_id: "xtb-account" }],
        confirmedRuleIdsForCurrentMonth: ["rule-investments"],
      });
      expect(alreadyConfirmed.timeline[0]).toEqual(
        expect.objectContaining({ month: "2026-08", contribution: 50 }),
      );
    });
  });
});
