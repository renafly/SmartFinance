import { TransactionsRepository } from "./transactions.repository";

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

function createQuery(result: QueryResult) {
  const query: Record<string, jest.Mock> = {};
  const chain = () => query;

  [
    "select",
    "eq",
    "gte",
    "lte",
    "order",
    "range",
    "not",
    "is",
    "limit",
    "in",
  ].forEach((method) => {
    query[method] = jest.fn(chain);
  });

  query.then = jest.fn((resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(
      resolve({ data: result.data ?? null, error: result.error ?? null }),
    ),
  );

  return query;
}

/**
 * Routes `.from("categories")` (used internally to expand a parent category
 * filter into itself + its subcategory ids) to its own mock query, separate
 * from `.from("transactions")`, so asserting on the transactions query's
 * `.eq`/`.in` calls isn't polluted by the categories lookup's result rows.
 */
function createFromRouter(
  transactionsQuery: Record<string, jest.Mock>,
  categoriesResult: QueryResult = { data: [] },
) {
  const categoriesQuery = createQuery(categoriesResult);
  const from = jest.fn((table: string) =>
    table === "categories" ? categoriesQuery : transactionsQuery,
  );
  return { from, categoriesQuery };
}

describe("TransactionsRepository", () => {
  it("sends movement filters to the pagination-safe RPC", async () => {
    const rows = [{
      movement_id: "group-1",
      movement_kind: "transfer",
      balance_after_transaction: null,
    }];
    const rpc = jest.fn(async () => ({ data: rows, error: null }));
    const repository = new TransactionsRepository({ rpc } as any);

    await expect(repository.listMovements("household-1", {
      kind: "transfer",
      accountId: "account-any",
      sourceAccountId: "account-from",
      destinationAccountId: "account-to",
      categoryId: "category-1",
      createdBy: "profile-1",
      from: "2026-08-01",
      to: "2026-08-31",
      sortBy: "oldest",
      limit: 20,
      offset: 40,
    })).resolves.toEqual({
      data: [expect.objectContaining({ ...rows[0], balance_after_transaction: null })],
      error: null,
    });

    expect(rpc).toHaveBeenCalledWith("list_transaction_movements", {
      p_household_id: "household-1", p_kind: "transfer", p_account_id: "account-any",
      p_source_account_id: "account-from", p_destination_account_id: "account-to",
      p_category_id: "category-1", p_uncategorized: false, p_created_by: "profile-1",
      p_from: "2026-08-01", p_to: "2026-08-31", p_sort: "oldest", p_limit: 20, p_offset: 40,
      p_exclude_transfers: false, p_search: null, p_min_amount: null, p_max_amount: null,
    });
  });

  it("requests the transaction-only uncategorized mode from the movement RPC", async () => {
    const rpc = jest.fn(async () => ({ data: [], error: null }));
    const repository = new TransactionsRepository({ rpc } as any);

    await repository.listMovements("household-1", { categoryId: null });

    expect(rpc).toHaveBeenCalledWith(
      "list_transaction_movements",
      expect.objectContaining({
        p_household_id: "household-1",
        p_kind: null,
        p_category_id: null,
        p_uncategorized: true,
      }),
    );
  });

  it("uses the running balance returned by the movement RPC without a second query", async () => {
    const rows = [
      {
        movement_id: "transaction-1",
        movement_kind: "expense",
        transaction_id: "transaction-1",
        balance_after_transaction: 875.5,
      },
    ];
    const rpc = jest.fn(async () => ({ data: rows, error: null }));
    const from = jest.fn();
    const repository = new TransactionsRepository({
      rpc,
      from,
    } as any);

    await expect(repository.listMovements("household-1")).resolves.toEqual({
      data: [
        expect.objectContaining({
          movement_id: "transaction-1",
          balance_after_transaction: 875.5,
        }),
      ],
      error: null,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("updates both completed transfer legs through one RPC", async () => {
    const rpc = jest.fn(async () => ({ data: "group-1", error: null }));
    const repository = new TransactionsRepository({ rpc } as any);
    await repository.updateCompletedTransfer({ transferGroupId: "group-1", sourceAccountId: "from", destinationAccountId: "to", amount: 42, title: "Move", transactionDate: "2026-08-03", categoryId: null });
    expect(rpc).toHaveBeenCalledWith("update_completed_transfer", expect.objectContaining({ p_transfer_group_id: "group-1", p_source_account_id: "from", p_destination_account_id: "to", p_amount: 42 }));
  });

  it("bulk-updates the category on every leg of the selected transfer groups", async () => {
    const rpc = jest.fn(async () => ({ data: 2, error: null }));
    const repository = new TransactionsRepository({ rpc } as any);
    await expect(
      repository.bulkUpdateTransferCategory({
        householdId: "household-1",
        transferGroupIds: ["group-1", "group-2"],
        categoryId: "category-1",
      }),
    ).resolves.toEqual({ data: 2, error: null });
    expect(rpc).toHaveBeenCalledWith("bulk_update_transfer_category", {
      p_household_id: "household-1",
      p_transfer_group_ids: ["group-1", "group-2"],
      p_category_id: "category-1",
    });
  });

  it("deletes both completed transfer legs through one RPC", async () => {
    const rpc = jest.fn(async () => ({ data: 2, error: null }));
    const repository = new TransactionsRepository({ rpc } as any);
    await expect(repository.deleteCompletedTransfer("group-1")).resolves.toEqual({ data: 2, error: null });
    expect(rpc).toHaveBeenCalledWith("delete_completed_transfer", { p_transfer_group_id: "group-1" });
  });

  it("creates transfers with the expected RPC payload and provided transaction date", async () => {
    const rpc = jest.fn(async () => ({
      data: "transfer-group-1",
      error: null,
    }));
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
    const rpc = jest.fn(async () => ({
      data: "transfer-group-1",
      error: null,
    }));
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
    // No subcategories for "category-1" here, so the filter should still
    // resolve to a plain `.eq("category_id", ...)`, unchanged from before.
    const { from } = createFromRouter(query, { data: [] });
    const client = { from };
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
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("balance_after_transaction"),
    );
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("category:categories(id, name, icon)"),
    );
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.eq).toHaveBeenCalledWith("account_id", "account-1");
    expect(query.eq).toHaveBeenCalledWith("category_id", "category-1");
    expect(query.in).not.toHaveBeenCalledWith(
      "category_id",
      expect.anything(),
    );
    expect(query.eq).toHaveBeenCalledWith("created_by", "profile-1");
    expect(query.eq).toHaveBeenCalledWith("type", "expense");
    expect(query.gte).toHaveBeenCalledWith("transaction_date", "2026-07-01");
    expect(query.lte).toHaveBeenCalledWith("transaction_date", "2026-07-31");
    expect(query.order).toHaveBeenCalledWith("transaction_date", {
      ascending: false,
    });
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(20, 29);
  });

  it("normalizes list errors", async () => {
    const error = new Error("list failed");
    const query = createQuery({ error });
    const repository = new TransactionsRepository({
      from: jest.fn(() => query),
    } as any);

    await expect(repository.listForHousehold("household-1")).resolves.toEqual({
      data: null,
      error,
    });
  });

  it("applies oldest-first ordering before pagination", async () => {
    const query = createQuery({ data: [] });
    const repository = new TransactionsRepository({
      from: jest.fn(() => query),
    } as any);

    await repository.listForHousehold("household-1", {
      sortBy: "oldest",
      limit: 20,
      offset: 0,
    });

    expect(query.order.mock.calls).toEqual([
      ["transaction_date", { ascending: true }],
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(query.range).toHaveBeenCalledWith(0, 19);
  });

  it.each([
    ["amount_desc", false],
    ["amount_asc", true],
  ] as const)("applies %s ordering before pagination", async (sortBy, ascending) => {
    const query = createQuery({ data: [] });
    const repository = new TransactionsRepository({
      from: jest.fn(() => query),
    } as any);

    await repository.listForHousehold("household-1", {
      sortBy,
      limit: 20,
    });

    expect(query.order.mock.calls[0]).toEqual(["amount", { ascending }]);
    expect(query.range).toHaveBeenCalledWith(0, 19);
  });

  it("expands a parent category filter to include its subcategory ids", async () => {
    const query = createQuery({ data: [] });
    const { from, categoriesQuery } = createFromRouter(query, {
      data: [{ id: "sub-1" }, { id: "sub-2" }],
    });
    const repository = new TransactionsRepository({ from } as any);

    await repository.listForHousehold("household-1", {
      categoryId: "parent-1",
    });

    expect(categoriesQuery.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(categoriesQuery.eq).toHaveBeenCalledWith("parent_id", "parent-1");
    expect(query.in).toHaveBeenCalledWith("category_id", [
      "parent-1",
      "sub-1",
      "sub-2",
    ]);
    expect(query.eq).not.toHaveBeenCalledWith("category_id", expect.anything());
  });

  it("keeps an exact-match filter when the selected category has no subcategories (e.g. it is itself a subcategory)", async () => {
    const query = createQuery({ data: [] });
    const { from } = createFromRouter(query, { data: [] });
    const repository = new TransactionsRepository({ from } as any);

    await repository.listForHousehold("household-1", {
      categoryId: "sub-1",
    });

    expect(query.eq).toHaveBeenCalledWith("category_id", "sub-1");
    expect(query.in).not.toHaveBeenCalledWith(
      "category_id",
      expect.anything(),
    );
  });

  it("filters uncategorized transactions with an IS NULL query", async () => {
    const query = createQuery({ data: [] });
    const repository = new TransactionsRepository({
      from: jest.fn(() => query),
    } as any);

    await repository.listForHousehold("household-1", { categoryId: null });

    expect(query.is).toHaveBeenCalledWith("category_id", null);
    expect(query.eq).not.toHaveBeenCalledWith("category_id", expect.anything());
  });

  it("loads bounded categorized non-transfer history for suggestions", async () => {
    const rows = [
      { id: "transaction-1", category: { id: "food", name: "Food" } },
    ];
    const query = createQuery({ data: rows });
    const client = { from: jest.fn(() => query) };
    const repository = new TransactionsRepository(client as any);

    await expect(
      repository.listCategorySuggestionHistory("household-1", "expense", 900),
    ).resolves.toEqual({ data: rows, error: null });
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.eq).toHaveBeenCalledWith("type", "expense");
    expect(query.not).toHaveBeenCalledWith("category_id", "is", null);
    expect(query.is).toHaveBeenCalledWith("transfer_group_id", null);
    expect(query.limit).toHaveBeenCalledWith(500);
  });

  it("loads bounded household title history by transaction type", async () => {
    const rows = [{ id: "transaction-1", title: "Groceries" }];
    const query = createQuery({ data: rows });
    const client = { from: jest.fn(() => query) };
    const repository = new TransactionsRepository(client as any);

    await expect(
      repository.listTitleSuggestionHistory("household-1", "expense", 900),
    ).resolves.toEqual({ data: rows, error: null });
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.eq).toHaveBeenCalledWith("type", "expense");
    expect(query.is).toHaveBeenCalledWith("transfer_group_id", null);
    expect(query.limit).toHaveBeenCalledWith(500);
  });
});
