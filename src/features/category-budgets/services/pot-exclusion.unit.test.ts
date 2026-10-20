import {
  budgetPlannedExpenseAmount,
  budgetShareOfExpense,
  isBudgetAccount,
  type PotClassifiableAccount,
} from "./pot-exclusion";

const accounts = new Map<string, PotClassifiableAccount>([
  ["checking", { id: "checking", type: "bank" }],
  // A bank account linked to a saving pot (e.g. a meal card / shared card) still counts.
  ["meal-card", { id: "meal-card", type: "bank" }],
  ["card", { id: "card", type: "credit_card" }],
  ["wallet", { id: "wallet", type: "cash" }],
  ["revolut-pot", { id: "revolut-pot", type: "savings" }],
  ["broker", { id: "broker", type: "investment" }],
  ["retirement", { id: "retirement", type: "ppr" }],
]);

describe("isBudgetAccount", () => {
  it("counts only bank accounts", () => {
    expect(isBudgetAccount("checking", accounts)).toBe(true);
    expect(isBudgetAccount("meal-card", accounts)).toBe(true);
  });

  it("ignores every other account type, unknown ids and null", () => {
    for (const id of ["card", "wallet", "revolut-pot", "broker", "retirement", "unknown"]) {
      expect(isBudgetAccount(id, accounts)).toBe(false);
    }
    expect(isBudgetAccount(null, accounts)).toBe(false);
  });
});

describe("budgetShareOfExpense", () => {
  it("is 1 for an expense paid from a bank account and 0 from any other account type", () => {
    expect(budgetShareOfExpense({ accountId: "checking" }, accounts)).toBe(1);
    expect(budgetShareOfExpense({ accountId: "meal-card" }, accounts)).toBe(1);
    expect(budgetShareOfExpense({ accountId: "revolut-pot" }, accounts)).toBe(0);
    expect(budgetShareOfExpense({ accountId: "card" }, accounts)).toBe(0);
  });

  it("is 0 when funded straight from a pot", () => {
    expect(budgetShareOfExpense({ accountId: "checking", potId: "pot-1" }, accounts)).toBe(0);
  });

  it("returns the share of split allocations paid from bank accounts", () => {
    const share = budgetShareOfExpense(
      {
        accountId: "checking",
        allocations: [
          { sourceType: "account", accountId: "checking", potId: null, amount: 30 },
          { sourceType: "account", accountId: "meal-card", potId: null, amount: 20 },
          { sourceType: "pot", accountId: null, potId: "pot-1", amount: 40 },
          { sourceType: "account", accountId: "card", potId: null, amount: 10 },
        ],
      },
      accounts,
    );
    expect(share).toBeCloseTo(0.5);
  });
});

describe("budgetPlannedExpenseAmount", () => {
  it("drops destination legs landing in non-bank accounts and keeps the rest", () => {
    expect(
      budgetPlannedExpenseAmount(
        { sourceAccountId: "checking", expectedAmount: 500 },
        [
          { destinationAccountId: "revolut-pot", amount: 150 },
          { destinationAccountId: "broker", amount: 100 },
          { destinationAccountId: "meal-card", amount: 50 },
        ],
        accounts,
      ),
    ).toBe(250);
  });

  it("is 0 when the planned expense is not paid from a bank account", () => {
    expect(budgetPlannedExpenseAmount({ sourceAccountId: "revolut-pot", expectedAmount: 80 }, [], accounts)).toBe(0);
    expect(budgetPlannedExpenseAmount({ sourceAccountId: "card", expectedAmount: 80 }, [], accounts)).toBe(0);
  });

  it("is the full amount for a plain expense from a bank account", () => {
    expect(budgetPlannedExpenseAmount({ sourceAccountId: "checking", expectedAmount: 80 }, [], accounts)).toBe(80);
  });
});
