import { TransactionsRepository } from "./transactions.repository";

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

function createQuery(result: QueryResult) {
  const query: Record<string, jest.Mock> = {};
  const chain = () => query;

  ["select", "eq", "gte", "lte", "order", "range"].forEach((method) => {
    query[method] = jest.fn(chain);
  });

  query.then = jest.fn((resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
  );

  return query;
}

describe("TransactionsRepository", () => {
  it("creates transfers with the expected RPC payload and provided transaction date", async () => {
    const rpc = jest.fn(async () => ({ data: "transfer-group-1", error: null }));
    const repository = new TransactionsRepository({ rpc } as any);

    await expect(
      repository.createTransfer({
        householdId: "household-1",
        fromAccountId: "account-from",
        toAccountId: "account-to",
        amount: 120,
        title: "Move to Revolut",
        notes: "Monthly top-up",
        transactionDate: "2026-07-09T09:30:00.000Z",
        createdBy: "profile-1",
        categoryId: "category-1",
        monthlyBudgetRunId: "budget-run-1",
        generatedByRuleId: "rule-1",
        budgetSection: "savings",
      } as any),
    ).resolves.toEqual({ data: "transfer-group-1", error: null });

    expect(rpc).toHaveBeenCalledWith("create_transfer", {
      p_household_id: "household-1",
      p_from_account_id: "account-from",
      p_to_account_id: "account-to",
      p_amount: 120,
      p_title: "Move to Revolut",
      p_notes: "Monthly top-up",
      p_transaction_date: "2026-07-09T09:30:00.000Z",
      p_created_by: "profile-1",
      p_category_id: "category-1",
      p_monthly_budget_run_id: "budget-run-1",
      p_generated_by_rule_id: "rule-1",
      p_budget_section: "savings",
    });
  });

  it("defaults optional transfer fields and transactionDate in the RPC payload", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
    const rpc = jest.fn(async () => ({ data: "transfer-group-1", error: null }));
    const repository = new TransactionsRepository({ rpc } as any);

    await repository.createTransfer({
      householdId: "household-1",
      fromAccountId: "account-from",
      toAccountId: "account-to",
      amount: 120,
      title: "Move to Revolut",
      createdBy: "profile-1",
    });

    expect(rpc).toHaveBeenCalledWith("create_transfer", {
      p_household_id: "household-1",
      p_from_account_id: "account-from",
      p_to_account_id: "account-to",
      p_amount: 120,
      p_title: "Move to Revolut",
      p_notes: "",
      p_transaction_date: "2026-07-09T12:00:00.000Z",
      p_created_by: "profile-1",
      p_category_id: null,
      p_monthly_budget_run_id: null,
      p_generated_by_rule_id: null,
      p_budget_section: null,
    });
  });

  it("applies household list filters, date bounds, ordering, and range", async () => {
    const rows = [{ id: "transaction-1" }];
    const query = createQuery({ data: rows });
    const client = {
      from: jest.fn(() => query),
    };
    const repository = new TransactionsRepository(client as any);

    await expect(
      repository.listForHousehold("household-1", {
        accountId: "account-1",
        categoryId: "category-1",
        createdBy: "profile-1",
        type: "expense" as any,
        from: "2026-07-01",
        to: "2026-07-31",
        limit: 10,
        offset: 20,
      }),
    ).resolves.toEqual({ data: rows, error: null });

    expect(client.from).toHaveBeenCalledWith("transactions");
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.eq).toHaveBeenCalledWith("account_id", "account-1");
    expect(query.eq).toHaveBeenCalledWith("category_id", "category-1");
    expect(query.eq).toHaveBeenCalledWith("created_by", "profile-1");
    expect(query.eq).toHaveBeenCalledWith("type", "expense");
    expect(query.gte).toHaveBeenCalledWith("transaction_date", "2026-07-01");
    expect(query.lte).toHaveBeenCalledWith("transaction_date", "2026-07-31");
    expect(query.order).toHaveBeenCalledWith("transaction_date", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(20, 29);
  });

  it("normalizes list errors", async () => {
    const error = new Error("list failed");
    const query = createQuery({ error });
    const repository = new TransactionsRepository({ from: jest.fn(() => query) } as any);

    await expect(repository.listForHousehold("household-1")).resolves.toEqual({
      data: null,
      error,
    });
  });
});
