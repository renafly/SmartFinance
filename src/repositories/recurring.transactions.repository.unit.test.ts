import { RecurringTransactionsRepository } from "./recurring.transactions.repository";

type QueryResult = { data?: unknown; error?: unknown };

function createQuery(result: QueryResult) {
  const query: Record<string, jest.Mock> = {};
  const chain = () => query;

  ["select", "eq", "order"].forEach((method) => {
    query[method] = jest.fn(chain);
  });
  query.then = jest.fn((resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
  );

  return query;
}

describe("RecurringTransactionsRepository", () => {
  it("loads recurring rules with account and explicit transfer destinations", async () => {
    const rows = [{ id: "rule-1", rule_kind: "transfer" }];
    const query = createQuery({ data: rows });
    const client = { from: jest.fn(() => query) };
    const repository = new RecurringTransactionsRepository(client as any);

    await expect(repository.listForHousehold("household-1", false)).resolves.toEqual({
      data: rows,
      error: null,
    });

    expect(client.from).toHaveBeenCalledWith("recurring_transactions");
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("destination_account"));
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("destination_pot"));
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.order).toHaveBeenCalledWith("next_run", { ascending: true });
  });

  it("loads execution history newest first", async () => {
    const rows = [{ id: "execution-1", scheduled_for: "2026-07-10" }];
    const query = createQuery({ data: rows });
    const client = { from: jest.fn(() => query) };
    const repository = new RecurringTransactionsRepository(client as any);

    await expect(repository.listExecutions("rule-1")).resolves.toEqual({
      data: rows,
      error: null,
    });

    expect(client.from).toHaveBeenCalledWith("recurring_run_executions");
    expect(query.eq).toHaveBeenCalledWith("recurring_transaction_id", "rule-1");
    expect(query.order).toHaveBeenCalledWith("scheduled_for", { ascending: false });
  });
});
