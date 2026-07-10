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
  it("only counts active recurring transfers explicitly targeted to the pot", () => {
    const result = forecast({
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          destination_pot_id: "pot-1",
          amount: 150,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
        {
          id: "transaction-1",
          rule_kind: "transaction",
          destination_pot_id: "pot-1",
          amount: 900,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
        {
          id: "other-pot",
          rule_kind: "transfer",
          destination_pot_id: "pot-2",
          amount: 900,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
    });

    expect(result.monthlyContribution).toBe(150);
    expect(result.sources).toEqual([
      { kind: "recurring_transfer", monthlyContribution: 150, contributionCount: 1 },
    ]);
    expect(result.completionDate).toBe("2026-12-10");
  });

  it("combines targeted recurring transfers with active persisted monthly budget rules", () => {
    const result = forecast({
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          destination_pot_id: "pot-1",
          amount: 100,
          frequency: "monthly",
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
      monthlyBudgetRules: [
        {
          id: "budget-1",
          destination_pot_id: "pot-1",
          amount: 200,
          frequency: "monthly",
          created_at: "2026-07-05T00:00:00.000Z",
          is_active: true,
        },
        {
          id: "inactive",
          destination_pot_id: "pot-1",
          amount: 800,
          frequency: "monthly",
          created_at: "2026-07-05T00:00:00.000Z",
          is_active: false,
        },
      ],
    });

    expect(result.monthlyContribution).toBe(300);
    expect(result.sources).toEqual([
      { kind: "recurring_transfer", monthlyContribution: 100, contributionCount: 1 },
      { kind: "monthly_budget", monthlyContribution: 200, contributionCount: 1 },
    ]);
    expect(result.completionDate).toBe("2026-09-10");
  });

  it("uses a legacy Pots-section rule when its destination account belongs to one pot", () => {
    const result = forecast({
      monthlyBudgetRules: [{
        id: "legacy-pot-rule",
        section: "pots",
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

  it("does not guess a pot when a destination account is shared by multiple pots", () => {
    const result = forecast({
      monthlyBudgetRules: [{
        id: "ambiguous-rule",
        section: "pots",
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

  it("honours custom excluded months when projecting recurring transfers", () => {
    const result = forecast({
      pots: [{ id: "pot-1", targetAmount: 400, currentAmount: 0 }],
      recurringTransfers: [
        {
          id: "transfer-1",
          rule_kind: "transfer",
          destination_pot_id: "pot-1",
          amount: 100,
          frequency: "custom",
          excluded_months: [8],
          next_run: "2026-07-10",
          is_active: true,
        },
      ],
    });

    expect(result.completionDate).toBe("2026-11-10");
  });

  it("returns localized-state-ready reasons for missing targets and contributions", () => {
    expect(
      forecast({ pots: [{ id: "pot-1", targetAmount: null, currentAmount: 0 }] }).unavailableReason,
    ).toBe("missing_target");
    expect(forecast().unavailableReason).toBe("no_active_contributions");
  });
});
