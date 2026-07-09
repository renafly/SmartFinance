import { BaseRepository } from "./base.repository";

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
    "order",
    "range",
    "insert",
    "update",
    "delete",
    "single",
    "maybeSingle",
  ].forEach((method) => {
    query[method] = jest.fn(chain);
  });

  query.then = jest.fn((resolve: (value: QueryResult) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
  );

  return query;
}

function createClient(result: QueryResult) {
  const query = createQuery(result);
  const client = {
    from: jest.fn(() => query),
  };

  return { client, query };
}

describe("BaseRepository", () => {
  it("normalizes list results and applies filters, ordering, and ranges", async () => {
    const rows = [{ id: "transaction-1", household_id: "household-1" }];
    const { client, query } = createClient({ data: rows });
    const repository = new BaseRepository(client as any, "transactions");

    await expect(
      repository.list({
        filters: { household_id: "household-1", category_id: undefined } as any,
        orderBy: { column: "transaction_date" as any, ascending: false },
        limit: 2,
        offset: 3,
      }),
    ).resolves.toEqual({ data: rows, error: null });

    expect(client.from).toHaveBeenCalledWith("transactions");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("household_id", "household-1");
    expect(query.order).toHaveBeenCalledWith("transaction_date", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(3, 4);
  });

  it("normalizes empty list data to an empty array", async () => {
    const { client } = createClient({ data: null });
    const repository = new BaseRepository(client as any, "transactions");

    await expect(repository.list()).resolves.toEqual({ data: [], error: null });
  });

  it("normalizes findById success, query errors, and missing rows", async () => {
    const row = { id: "transaction-1" };
    const success = createClient({ data: row });
    const repository = new BaseRepository(success.client as any, "transactions");

    await expect(repository.findById("transaction-1")).resolves.toEqual({
      data: row,
      error: null,
    });
    expect(success.query.eq).toHaveBeenCalledWith("id", "transaction-1");
    expect(success.query.maybeSingle).toHaveBeenCalled();

    const queryError = new Error("database failed");
    await expect(
      new BaseRepository(createClient({ error: queryError }).client as any, "transactions").findById(
        "missing",
      ),
    ).resolves.toEqual({ data: null, error: queryError });

    const missing = await new BaseRepository(
      createClient({ data: null }).client as any,
      "transactions",
    ).findById("missing");
    expect(missing.data).toBeNull();
    expect(missing.error).toEqual(new Error("transactions missing not found"));
  });

  it("normalizes create, update, and delete results", async () => {
    const created = { id: "transaction-1", title: "Created" };
    const createClientResult = createClient({ data: created });
    const createRepository = new BaseRepository(createClientResult.client as any, "transactions");

    await expect(createRepository.create({ title: "Created" } as any)).resolves.toEqual({
      data: created,
      error: null,
    });
    expect(createClientResult.query.insert).toHaveBeenCalledWith({ title: "Created" });
    expect(createClientResult.query.single).toHaveBeenCalled();

    const updated = { id: "transaction-1", title: "Updated" };
    const updateClientResult = createClient({ data: updated });
    const updateRepository = new BaseRepository(updateClientResult.client as any, "transactions");

    await expect(updateRepository.update("transaction-1", { title: "Updated" } as any)).resolves.toEqual({
      data: updated,
      error: null,
    });
    expect(updateClientResult.query.update).toHaveBeenCalledWith({ title: "Updated" });
    expect(updateClientResult.query.eq).toHaveBeenCalledWith("id", "transaction-1");

    const deleteClientResult = createClient({});
    const deleteRepository = new BaseRepository(deleteClientResult.client as any, "transactions");

    await expect(deleteRepository.delete("transaction-1")).resolves.toEqual({
      data: null,
      error: null,
    });
    expect(deleteClientResult.query.delete).toHaveBeenCalled();
    expect(deleteClientResult.query.eq).toHaveBeenCalledWith("id", "transaction-1");
  });

  it("returns normalized errors for create, update, and delete failures", async () => {
    const createError = new Error("create failed");
    await expect(
      new BaseRepository(createClient({ error: createError }).client as any, "transactions").create(
        {} as any,
      ),
    ).resolves.toEqual({ data: null, error: createError });

    const updateError = new Error("update failed");
    await expect(
      new BaseRepository(createClient({ error: updateError }).client as any, "transactions").update(
        "transaction-1",
        {} as any,
      ),
    ).resolves.toEqual({ data: null, error: updateError });

    const deleteError = new Error("delete failed");
    await expect(
      new BaseRepository(createClient({ error: deleteError }).client as any, "transactions").delete(
        "transaction-1",
      ),
    ).resolves.toEqual({ data: null, error: deleteError });
  });
});
