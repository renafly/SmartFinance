import { transactionSchema } from "./transaction.schema";

const accountId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const potId = "33333333-3333-4333-8333-333333333333";

describe("transactionSchema", () => {
  it("coerces amount strings and keeps nullable relationship fields", () => {
    const result = transactionSchema.parse({
      account_id: accountId,
      category_id: categoryId,
      pot_id: potId,
      type: "expense",
      title: "Groceries",
      amount: "42.35",
      notes: null,
      date: "2026-07-09",
    });

    expect(result).toEqual({
      account_id: accountId,
      category_id: categoryId,
      pot_id: potId,
      type: "expense",
      title: "Groceries",
      amount: 42.35,
      notes: null,
      date: "2026-07-09",
    });
  });

  it("accepts income or expense transactions but excludes transfers", () => {
    expect(
      transactionSchema.parse({
        account_id: accountId,
        category_id: null,
        type: "income",
        title: "Salary",
        amount: "3000",
        date: "2026-07-01",
      }),
    ).toMatchObject({ type: "income", amount: 3000 });

    expect(() =>
      transactionSchema.parse({
        account_id: accountId,
        category_id: null,
        type: "transfer",
        title: "Move to savings",
        amount: "500",
        date: "2026-07-01",
      }),
    ).toThrow();
  });

  it("rejects invalid identifiers, empty titles, and non-positive amounts", () => {
    expect(() =>
      transactionSchema.parse({
        account_id: "not-an-id",
        category_id: null,
        type: "expense",
        title: "Transport",
        amount: "10",
        date: "2026-07-09",
      }),
    ).toThrow("Please select an account");

    expect(() =>
      transactionSchema.parse({
        account_id: accountId,
        category_id: null,
        type: "expense",
        title: "",
        amount: "10",
        date: "2026-07-09",
      }),
    ).toThrow("Title is required");

    expect(() =>
      transactionSchema.parse({
        account_id: accountId,
        category_id: null,
        type: "expense",
        title: "Refund",
        amount: "0",
        date: "2026-07-09",
      }),
    ).toThrow("Amount must be greater than zero");
  });
});
