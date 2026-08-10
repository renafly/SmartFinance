import {
  buildDefaultWageFlowConfig,
  buildOneWageFlowCategoryPerMainCategory,
  calculateWageFlow,
  type WageFlowCategoryConfig,
} from "./wage-flow";
import type { InsightTransaction } from "./types";

const tx = (overrides: Partial<InsightTransaction> = {}): InsightTransaction => ({
  id: "tx",
  title: "Transaction",
  amount: 100,
  type: "expense",
  transaction_date: "2026-07-15",
  account_id: "bank-1",
  category_id: null,
  transfer_group_id: null,
  ...overrides,
});

const accounts = [
  { id: "bank-1", type: "bank" },
  { id: "cash-1", type: "cash" },
  { id: "credit-1", type: "credit_card" },
  { id: "savings-1", type: "savings" },
  { id: "investment-1", type: "investment" },
  { id: "ppr-1", type: "ppr" },
];

const categories = [
  { id: "groceries", is_discretionary: false, parent_id: null },
  { id: "dining-out", is_discretionary: true, parent_id: null },
  { id: "takeaway", is_discretionary: true, parent_id: "dining-out" },
];

function catchAll(overrides: Partial<WageFlowCategoryConfig> = {}): WageFlowCategoryConfig {
  return {
    id: "catch-all",
    name: "Everything",
    colorToken: "financialNegative",
    icon: "cart-outline",
    includeAllTransactions: true,
    accountIds: [],
    categoryIds: [],
    potAccountIds: [],
    includeTransfersBetweenAccounts: false,
    includeTransfersIntoPots: false,
    ...overrides,
  };
}

function bucket(report: ReturnType<typeof calculateWageFlow>, id: string) {
  return report.categories.find((item) => item.id === id)!;
}

describe("calculateWageFlow", () => {
  it("sums non-transfer income regardless of config", () => {
    const report = calculateWageFlow({
      transactions: [tx({ id: "salary", type: "income", amount: 2000, account_id: "bank-1" })],
      accounts,
      categories,
      config: [],
    });
    expect(report.income).toBe(2000);
  });

  it("matches an includeAllTransactions catch-all category", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ type: "income", amount: 1000, account_id: "bank-1" }),
        tx({ type: "expense", amount: 200, account_id: "bank-1" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
    });
    expect(bucket(report, "catch-all").amount).toBe(200);
    expect(bucket(report, "catch-all").share).toBe(20);
  });

  it("matches a specific-accounts rule for non-transfer expenses, as a negative (outflow from that account)", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ type: "expense", amount: 60, account_id: "cash-1" }),
        tx({ type: "expense", amount: 40, account_id: "bank-1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "cash-only",
          includeAllTransactions: false,
          accountIds: ["cash-1"],
        }),
      ],
    });
    expect(bucket(report, "cash-only").amount).toBe(-60);
  });

  it("matches a categoryIds rule and auto-expands to subcategories", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ type: "expense", amount: 30, account_id: "bank-1", category_id: "dining-out" }),
        tx({ type: "expense", amount: 15, account_id: "bank-1", category_id: "takeaway" }),
        tx({ type: "expense", amount: 50, account_id: "bank-1", category_id: "groceries" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "dining",
          includeAllTransactions: false,
          categoryIds: ["dining-out"],
        }),
      ],
    });
    // Both the parent category and its subcategory should be claimed.
    expect(bucket(report, "dining").amount).toBe(45);
  });

  it("matches specific pot accounts on the incoming transfer leg only", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({
          id: "out",
          type: "expense",
          amount: 100,
          account_id: "bank-1",
          transfer_group_id: "g1",
        }),
        tx({
          id: "in",
          type: "income",
          amount: 100,
          account_id: "savings-1",
          transfer_group_id: "g1",
        }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "house-deposit",
          includeAllTransactions: false,
          potAccountIds: ["savings-1"],
        }),
      ],
    });
    expect(bucket(report, "house-deposit").amount).toBe(100);
    expect(bucket(report, "house-deposit").matches).toHaveLength(1);
    expect(bucket(report, "house-deposit").matches[0].id).toBe("in");
  });

  it("matches a broad includeTransfersIntoPots rule for any pot-type destination", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "to-savings", type: "income", amount: 50, account_id: "savings-1", transfer_group_id: "g1" }),
        tx({ id: "to-investment", type: "income", amount: 25, account_id: "investment-1", transfer_group_id: "g2" }),
        tx({ id: "to-ppr", type: "income", amount: 10, account_id: "ppr-1", transfer_group_id: "g3" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "savings-goals",
          includeAllTransactions: false,
          includeTransfersIntoPots: true,
        }),
      ],
    });
    expect(bucket(report, "savings-goals").amount).toBe(85);
  });

  it("matches a broad includeTransfersBetweenAccounts rule for non-pot destinations", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "to-bank", type: "income", amount: 40, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "to-credit", type: "income", amount: 30, account_id: "credit-1", transfer_group_id: "g2" }),
        tx({ id: "to-savings", type: "income", amount: 20, account_id: "savings-1", transfer_group_id: "g3" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "internal-transfers",
          includeAllTransactions: false,
          includeTransfersBetweenAccounts: true,
        }),
      ],
    });
    // The savings-bound transfer is a pot destination and must NOT be caught here.
    expect(bucket(report, "internal-transfers").amount).toBe(70);
  });

  it("nets accountIds-scoped direct spend against transfers landing on that account (debt payments)", () => {
    const report = calculateWageFlow({
      transactions: [
        // A direct card purchase is an outflow from the tracked account, so
        // it now subtracts rather than adds.
        tx({ id: "direct-spend", type: "expense", amount: 75, account_id: "credit-1" }),
        tx({ id: "cc-out", type: "expense", amount: 300, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "cc-in", type: "income", amount: 300, account_id: "credit-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "debt-payments",
          includeAllTransactions: false,
          accountIds: ["credit-1"],
        }),
      ],
    });
    // 300 paid down (transfer in) - 75 spent (direct purchase) = 225 net.
    expect(bucket(report, "debt-payments").amount).toBe(225);
  });

  it("never separately counts a transfer's outgoing leg when nothing tracks the source account", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "out", type: "expense", amount: 300, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "in", type: "income", amount: 300, account_id: "savings-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [catchAll({ id: "expenses" }), catchAll({ id: "goals", includeAllTransactions: false, includeTransfersIntoPots: true })],
    });
    expect(bucket(report, "expenses").amount).toBe(0);
    expect(bucket(report, "goals").amount).toBe(300);
  });

  it("nets a savings pot's net contribution: 1000 transferred in, 200 spent directly out => 800", () => {
    // The exact scenario from the reported bug: a savings account has 1000
    // transferred in, then a 200 direct expense against that same account.
    // The net contribution must be 1000 - 200 = 800, never 1000 (outflow
    // ignored) and never 1200 (outflow wrongly added as if it were income).
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "transfer-out-leg", type: "expense", amount: 1000, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "transfer-in-leg", type: "income", amount: 1000, account_id: "savings-1", transfer_group_id: "g1" }),
        tx({ id: "pot-expense", type: "expense", amount: 200, account_id: "savings-1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "house-deposit",
          includeAllTransactions: false,
          potAccountIds: ["savings-1"],
        }),
      ],
    });
    expect(bucket(report, "house-deposit").amount).toBe(800);
  });

  it("treats a transfer leaving a tracked pot as negative for that pot (withdrawal)", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "deposit-out", type: "expense", amount: 1000, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "deposit-in", type: "income", amount: 1000, account_id: "savings-1", transfer_group_id: "g1" }),
        tx({ id: "withdrawal-out", type: "expense", amount: 200, account_id: "savings-1", transfer_group_id: "g2" }),
        tx({ id: "withdrawal-in", type: "income", amount: 200, account_id: "bank-1", transfer_group_id: "g2" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "house-deposit",
          includeAllTransactions: false,
          potAccountIds: ["savings-1"],
        }),
      ],
    });
    expect(bucket(report, "house-deposit").amount).toBe(800);
  });

  it("direct non-transfer income paid into a tracked account counts positively for that account, without inflating household income twice", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "interest", type: "income", amount: 15, account_id: "savings-1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "house-deposit",
          includeAllTransactions: false,
          potAccountIds: ["savings-1"],
        }),
      ],
    });
    // Still counted once toward the household's top-line income...
    expect(report.income).toBe(15);
    // ...and also attributed to the tracked pot's own net contribution.
    expect(bucket(report, "house-deposit").amount).toBe(15);
  });

  it("nets both legs of an internal transfer to zero when the same broad category catches both sides", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "shuffle-out", type: "expense", amount: 500, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "shuffle-in", type: "income", amount: 500, account_id: "cash-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "internal-transfers",
          includeAllTransactions: false,
          includeTransfersBetweenAccounts: true,
        }),
      ],
    });
    // Money moved between the household's own non-pot accounts -- neither
    // new income nor new spending, so the net contribution is zero even
    // though both legs were individually matched and counted.
    expect(bucket(report, "internal-transfers").amount).toBe(0);
    expect(bucket(report, "internal-transfers").matches).toHaveLength(2);
    expect(report.totalAllocated).toBe(0);
  });

  it("resolves overlaps with first-match-wins ordering", () => {
    const transactions = [
      tx({ type: "expense", amount: 40, account_id: "bank-1", category_id: "dining-out" }),
    ];
    const narrowFirst = calculateWageFlow({
      transactions,
      accounts,
      categories,
      config: [
        catchAll({ id: "dining", includeAllTransactions: false, categoryIds: ["dining-out"] }),
        catchAll({ id: "everything-else" }),
      ],
    });
    expect(bucket(narrowFirst, "dining").amount).toBe(40);
    expect(bucket(narrowFirst, "everything-else").amount).toBe(0);

    const broadFirst = calculateWageFlow({
      transactions,
      accounts,
      categories,
      config: [
        catchAll({ id: "everything-else" }),
        catchAll({ id: "dining", includeAllTransactions: false, categoryIds: ["dining-out"] }),
      ],
    });
    expect(bucket(broadFirst, "everything-else").amount).toBe(40);
    expect(bucket(broadFirst, "dining").amount).toBe(0);
  });

  it("reports unallocated income when categories don't cover everything", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ type: "income", amount: 1000, account_id: "bank-1" }),
        tx({ type: "expense", amount: 200, account_id: "bank-1" }),
      ],
      accounts,
      categories,
      config: [catchAll({ id: "some-expenses", includeAllTransactions: false, accountIds: ["cash-1"] })],
    });
    expect(report.income).toBe(1000);
    expect(report.totalAllocated).toBe(0);
    expect(report.unallocated).toBe(1000);
  });

  it("respects the date range filter", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ type: "income", amount: 1000, account_id: "bank-1", transaction_date: "2026-06-30" }),
        tx({ type: "income", amount: 500, account_id: "bank-1", transaction_date: "2026-07-15" }),
        tx({ type: "expense", amount: 50, account_id: "bank-1", transaction_date: "2026-07-20" }),
        tx({ type: "expense", amount: 999, account_id: "bank-1", transaction_date: "2026-08-01" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
      range: { from: "2026-07-01", to: "2026-07-31" },
    });
    expect(report.income).toBe(500);
    expect(bucket(report, "catch-all").amount).toBe(50);
  });
});

describe("buildDefaultWageFlowConfig", () => {
  const labels = {
    expenses: "Expenses",
    debtPayments: "Debt Payments",
    savingsAndGoals: "Savings and Goals",
    discretionary: "Discretionary Spending",
  };

  it("reproduces the previous fixed account-type mapping as an editable starting point", () => {
    const config = buildDefaultWageFlowConfig({ accounts, categories, labels });
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "salary", type: "income", amount: 2000, account_id: "bank-1" }),
        tx({ id: "groceries", type: "expense", amount: 200, account_id: "bank-1", category_id: "groceries" }),
        tx({ id: "dining", type: "expense", amount: 60, account_id: "bank-1", category_id: "dining-out" }),
        tx({ id: "cc-spend", type: "expense", amount: 75, account_id: "credit-1" }),
        tx({
          id: "cc-payment-out",
          type: "expense",
          amount: 150,
          account_id: "bank-1",
          transfer_group_id: "g1",
        }),
        tx({
          id: "cc-payment-in",
          type: "income",
          amount: 150,
          account_id: "credit-1",
          transfer_group_id: "g1",
        }),
        tx({
          id: "to-savings-out",
          type: "expense",
          amount: 100,
          account_id: "bank-1",
          transfer_group_id: "g2",
        }),
        tx({
          id: "to-savings-in",
          type: "income",
          amount: 100,
          account_id: "savings-1",
          transfer_group_id: "g2",
        }),
      ],
      accounts,
      categories,
      config,
    });

    expect(report.income).toBe(2000);
    expect(bucket(report, "discretionary").amount).toBe(60);
    expect(bucket(report, "debt-payments").amount).toBe(75); // 150 transfer-in - 75 direct spend (net)
    expect(bucket(report, "savings-and-goals").amount).toBe(100);
    expect(bucket(report, "expenses").amount).toBe(200); // groceries only, dining claimed already
  });

  it("puts credit_card account ids in accountIds without hardcoding any specific id", () => {
    const config = buildDefaultWageFlowConfig({ accounts, categories, labels });
    const debtPayments = config.find((item) => item.id === "debt-payments")!;
    expect(debtPayments.accountIds).toEqual(["credit-1"]);
  });
});

describe("buildOneWageFlowCategoryPerMainCategory", () => {
  const mainCategories = [
    { id: "housing", name: "Housing" },
    { id: "groceries", name: "Groceries" },
    { id: "transport", name: "Transport" },
  ];

  it("creates one separate config per main category, named after it and filtering only on it", () => {
    const created = buildOneWageFlowCategoryPerMainCategory({
      mainCategories,
      existingConfigs: [],
    });

    expect(created).toHaveLength(3);
    expect(created.map((config) => config.name)).toEqual(["Housing", "Groceries", "Transport"]);
    for (const config of created) {
      expect(config.categoryIds).toHaveLength(1);
    }
    expect(created[0].categoryIds).toEqual(["housing"]);
    expect(created[1].categoryIds).toEqual(["groceries"]);
    expect(created[2].categoryIds).toEqual(["transport"]);
    // Each generated entry gets its own id, distinct from every other config
    // and from the main category id itself -- these are independent, freely
    // editable/removable Wage Flow categories, not grouped into one filter.
    expect(new Set(created.map((config) => config.id)).size).toBe(3);
  });

  it("skips a main category that's already covered by an existing Wage Flow category", () => {
    const existingConfigs: WageFlowCategoryConfig[] = [
      catchAll({ id: "existing-housing", name: "Home stuff", categoryIds: ["housing"], includeAllTransactions: false }),
    ];

    const created = buildOneWageFlowCategoryPerMainCategory({ mainCategories, existingConfigs });

    expect(created.map((config) => config.name)).toEqual(["Groceries", "Transport"]);
  });

  it("adds nothing when every main category is already covered (idempotent re-run)", () => {
    const existingConfigs: WageFlowCategoryConfig[] = mainCategories.map((main) =>
      catchAll({ id: `wf-${main.id}`, name: main.name, categoryIds: [main.id], includeAllTransactions: false }),
    );

    const created = buildOneWageFlowCategoryPerMainCategory({ mainCategories, existingConfigs });

    expect(created).toEqual([]);
  });
});
