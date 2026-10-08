import {
  buildWageFlowConfigFromCategories,
  calculateWageFlow,
  netReimbursedWageFlowTransactions,
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
  { id: "groceries", name: "Groceries", is_discretionary: false, parent_id: null },
  { id: "dining-out", name: "Dining out", is_discretionary: true, parent_id: null },
  { id: "takeaway", name: "Takeaway", is_discretionary: true, parent_id: "dining-out" },
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

  it("matches a categorized transfer's outgoing leg by category, e.g. a Monthly Budget allocation tagged 'Investments'", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({
          id: "budget-out",
          type: "expense",
          amount: 200,
          account_id: "bank-1",
          category_id: "dining-out",
          transfer_group_id: "g1",
        }),
        tx({
          id: "budget-in",
          type: "income",
          amount: 200,
          account_id: "investment-1",
          transfer_group_id: "g1",
        }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "investments",
          includeAllTransactions: false,
          categoryIds: ["dining-out"],
        }),
      ],
    });

    expect(bucket(report, "investments").amount).toBe(200);
    expect(bucket(report, "investments").matches).toHaveLength(1);
    expect(bucket(report, "investments").matches[0].id).toBe("budget-out");
  });

  it("does not let a categorized transfer leg fall into an includeAllTransactions catch-all", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({
          id: "budget-out",
          type: "expense",
          amount: 200,
          account_id: "bank-1",
          category_id: "dining-out",
          transfer_group_id: "g1",
        }),
        tx({ id: "budget-in", type: "income", amount: 200, account_id: "investment-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
    });

    // includeAllTransactions must never pick up transfer legs, categorized
    // or not -- that would be a behavior change for every transfer already
    // in the system.
    expect(bucket(report, "catch-all").amount).toBe(0);
  });

  it("leaves an uncategorized transfer's category-pass eligibility unchanged (no category_id, no match)", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "out", type: "expense", amount: 200, account_id: "bank-1", transfer_group_id: "g1" }),
        tx({ id: "in", type: "income", amount: 200, account_id: "investment-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "investments",
          includeAllTransactions: false,
          categoryIds: ["dining-out"],
        }),
      ],
    });

    expect(bucket(report, "investments").amount).toBe(0);
    expect(bucket(report, "investments").matches).toHaveLength(0);
  });

  it("still lets a categorized transfer's destination leg claim a tracked-account pass independently of the source leg's category pass", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({
          id: "budget-out",
          type: "expense",
          amount: 200,
          account_id: "bank-1",
          category_id: "dining-out",
          transfer_group_id: "g1",
        }),
        tx({ id: "budget-in", type: "income", amount: 200, account_id: "investment-1", transfer_group_id: "g1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "investments-category",
          includeAllTransactions: false,
          categoryIds: ["dining-out"],
        }),
        catchAll({
          id: "investments-pot",
          includeAllTransactions: false,
          includeTransfersIntoPots: true,
        }),
      ],
    });

    // Two independent passes -- the outgoing leg is claimed by the category
    // bucket, the incoming leg (landing on a pot-type account) is claimed
    // by the tracked-account bucket, at the same time.
    expect(bucket(report, "investments-category").amount).toBe(200);
    expect(bucket(report, "investments-pot").amount).toBe(200);
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

  it("does not deduplicate an expense between a tracked-account flow and its own expense category flow", () => {
    // The reported scenario: Accounts/Investments/Pots tracks a savings
    // account via potAccountIds, and a separate flow section tracks a
    // specific expense category (e.g. "Utilities"). A bill paid directly
    // out of that savings pot must subtract from the pot's net contribution
    // AND still add to the Utilities category's total -- neither flow
    // should exclude the transaction just because the other also counted it.
    const report = calculateWageFlow({
      transactions: [
        tx({
          id: "utility-bill",
          type: "expense",
          amount: 120,
          account_id: "savings-1",
          category_id: "groceries",
        }),
      ],
      accounts,
      categories,
      config: [
        catchAll({
          id: "accounts-investments-pots",
          includeAllTransactions: false,
          potAccountIds: ["savings-1"],
        }),
        catchAll({
          id: "utilities",
          includeAllTransactions: false,
          categoryIds: ["groceries"],
        }),
      ],
    });
    expect(bucket(report, "accounts-investments-pots").amount).toBe(-120);
    expect(bucket(report, "utilities").amount).toBe(120);
  });

  it("still lets an includeAllTransactions catch-all claim a transaction already claimed by a tracked-account flow", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "direct-spend", type: "expense", amount: 75, account_id: "credit-1" }),
      ],
      accounts,
      categories,
      config: [
        catchAll({ id: "debt-payments", includeAllTransactions: false, accountIds: ["credit-1"] }),
        catchAll({ id: "expenses" }),
      ],
    });
    expect(bucket(report, "debt-payments").amount).toBe(-75);
    expect(bucket(report, "expenses").amount).toBe(75);
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

describe("calculateWageFlow subcategory breakdown", () => {
  it("sorts subcategories by share of the bucket descending, largest first", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "t-groceries", type: "expense", amount: 20, account_id: "bank-1", category_id: "groceries" }),
        tx({ id: "t-dining", type: "expense", amount: 50, account_id: "bank-1", category_id: "dining-out" }),
        tx({ id: "t-takeaway", type: "expense", amount: 30, account_id: "bank-1", category_id: "takeaway" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
    });

    const subs = bucket(report, "catch-all").subcategories;
    // dining-out (50) and takeaway (30) are separate category ids here since
    // this bucket isn't filtered to a specific categoryIds rule that would
    // merge them -- each contributing category shows up as its own group.
    expect(subs.map((s) => s.id)).toEqual(["dining-out", "takeaway", "groceries"]);
    expect(subs.map((s) => s.amount)).toEqual([50, 30, 20]);
    expect(subs.map((s) => s.share)).toEqual([50, 30, 20]);
  });

  it("breaks a tie in rounded share by the underlying amount, descending", () => {
    // 100 and 104 both round to a 0.10% share of 100000, but 104 is the
    // larger contributor and must sort first per the tie-break rule.
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "t-a1", type: "expense", amount: 100, account_id: "bank-1", category_id: "groceries" }),
        tx({ id: "t-a2", type: "expense", amount: 104, account_id: "bank-1", category_id: "dining-out" }),
        tx({ id: "t-a3", type: "expense", amount: 99796, account_id: "bank-1", category_id: "takeaway" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
    });

    const subs = bucket(report, "catch-all").subcategories;
    expect(subs.map((s) => s.id)).toEqual(["takeaway", "dining-out", "groceries"]);
    expect(subs[1].share).toBe(0.1);
    expect(subs[2].share).toBe(0.1);
    expect(subs[1].amount).toBe(104);
    expect(subs[2].amount).toBe(100);
  });

  it("leaves the breakdown empty when only a single group contributes (no meaningful drilldown)", () => {
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "t-only", type: "expense", amount: 75, account_id: "bank-1", category_id: "groceries" }),
      ],
      accounts,
      categories,
      config: [catchAll()],
    });

    expect(bucket(report, "catch-all").subcategories).toEqual([]);
  });
});

describe("buildWageFlowConfigFromCategories", () => {
  const appCategories = [
    { id: "housing", name: "Housing", parent_id: null, type: "expense", sort_order: 0, color: "#3B82F6", icon: "home-outline" },
    { id: "rent", name: "Rent", parent_id: "housing", type: "expense", sort_order: 0 },
    { id: "savings", name: "Savings & Investments", parent_id: null, type: "expense", sort_order: 2 },
    { id: "old", name: "Old", parent_id: null, type: "expense", sort_order: 1, is_archived: true },
    { id: "salary", name: "Salary", parent_id: null, type: "income", sort_order: 0 },
  ];

  it("has exactly one bucket per active main expense category, in Categories order", () => {
    const config = buildWageFlowConfigFromCategories(appCategories);
    expect(config.map((item) => item.id)).toEqual(["housing", "savings"]);
    expect(config[0]).toMatchObject({ name: "Housing", colorToken: "#3B82F6", icon: "home-outline", categoryIds: ["housing"] });
    expect(config.every((item) => !item.includeAllTransactions && item.accountIds.length === 0 && !item.includeTransfersIntoPots)).toBe(true);
  });

  it("counts subcategory expenses and categorized transfers into the main category's bucket", () => {
    const config = buildWageFlowConfigFromCategories(appCategories);
    const report = calculateWageFlow({
      transactions: [
        tx({ id: "salary", type: "income", amount: 2000, account_id: "bank-1" }),
        tx({ id: "rent", amount: 700, category_id: "rent" }),
        tx({ id: "to-pot", amount: 300, category_id: "savings", transfer_group_id: "g1" }),
        tx({ id: "to-pot-in", type: "income", amount: 300, category_id: "savings", transfer_group_id: "g1", account_id: "savings-1" }),
        tx({ id: "uncategorized", amount: 50 }),
      ],
      accounts,
      categories: appCategories,
      config,
    });
    expect(report.income).toBe(2000);
    expect(report.categories.map((item) => [item.id, item.amount])).toEqual([
      ["housing", 700],
      ["savings", 300],
    ]);
    expect(report.unallocated).toBe(1000);
  });
});

describe("netReimbursedWageFlowTransactions", () => {
  const expense = tx({ id: "exp", title: "Continente", amount: 257.7, account_id: "bank-1" });
  const reimbursementIncome = tx({
    id: "inc",
    title: "Continente · Carlos e Andreia",
    amount: 84.28,
    type: "income",
    reimbursement_id: "r1",
  });

  it("hides both the expense and the repayment when it was fully reimbursed", () => {
    const result = netReimbursedWageFlowTransactions(
      [tx({ id: "exp", amount: 84.28 }), reimbursementIncome],
      [{ transactionId: "exp", amount: 84.28, accountId: "bank-1" }],
    );
    expect(result).toEqual([]);
  });

  it("keeps only what is still missing when partly reimbursed, and drops the repayment income", () => {
    const result = netReimbursedWageFlowTransactions(
      [expense, reimbursementIncome],
      [{ transactionId: "exp", amount: 84.28, accountId: "bank-1" }],
    );
    expect(result).toEqual([{ ...expense, amount: 173.42 }]);
  });

  it("nets a split expense first on the leg paid from the account the repayment landed in", () => {
    // After a replenishment: 173.42 now funded by savings, 84.28 kept on the bank account
    // that also received the 84.28 repayment -> that leg disappears, the other is untouched.
    const legs = [
      tx({ id: "exp:a1", amount: 173.42, account_id: "savings-1" }),
      tx({ id: "exp:a2", amount: 84.28, account_id: "bank-1" }),
    ];
    const result = netReimbursedWageFlowTransactions(
      [...legs, reimbursementIncome],
      [{ transactionId: "exp", amount: 84.28, accountId: "bank-1" }],
    );
    expect(result).toEqual([legs[0]]);
  });

  it("spreads a repayment not tied to a leg's account proportionally across the legs", () => {
    const legs = [
      tx({ id: "exp:a1", amount: 150, account_id: "bank-1" }),
      tx({ id: "exp:a2", amount: 50, account_id: "cash-1" }),
    ];
    const result = netReimbursedWageFlowTransactions(legs, [
      { transactionId: "exp", amount: 40, accountId: null },
    ]);
    expect(result.map((leg) => leg.amount)).toEqual([120, 40]);
  });

  it("never touches transfers or unrelated transactions", () => {
    const transfer = tx({ id: "t1", transfer_group_id: "g1", amount: 500 });
    const other = tx({ id: "other", amount: 20 });
    expect(
      netReimbursedWageFlowTransactions([transfer, other], [{ transactionId: "exp", amount: 10, accountId: null }]),
    ).toEqual([transfer, other]);
  });

  it("is applied by calculateWageFlow when reimbursements are given (repayment no longer counted as income)", () => {
    const config: WageFlowCategoryConfig[] = [
      {
        id: "bank",
        name: "Bank",
        colorToken: "#3B82F6",
        icon: "wallet-outline",
        includeAllTransactions: false,
        accountIds: ["bank-1"],
        categoryIds: [],
        potAccountIds: [],
        includeTransfersBetweenAccounts: false,
        includeTransfersIntoPots: false,
      },
    ];
    const salary = tx({ id: "salary", type: "income", amount: 1000, account_id: "cash-1" });
    const report = calculateWageFlow({
      transactions: [salary, tx({ id: "exp", amount: 84.28 }), reimbursementIncome],
      accounts,
      categories,
      config,
      reimbursements: [{ transactionId: "exp", amount: 84.28, accountId: "bank-1" }],
    });
    expect(report.income).toBe(1000);
    expect(report.categories[0].amount).toBe(0);
    expect(report.categories[0].matches).toEqual([]);
  });
});
