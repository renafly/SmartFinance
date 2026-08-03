import {
  rankTransactionTitleSuggestions,
  type TransactionTitleHistory,
} from "./scoring";

const row = (
  title: string,
  overrides: Partial<TransactionTitleHistory> = {},
): TransactionTitleHistory => ({
  title,
  accountId: "account-b",
  categoryId: "food",
  categoryName: "Food",
  transactionDate: "2026-07-01",
  createdAt: "2026-07-01T12:00:00Z",
  ...overrides,
});

describe("transaction title suggestions", () => {
  it("requires two normalized characters and returns at most five matches", () => {
    const history = [
      "Alpha",
      "Alpine",
      "Almond",
      "Algebra",
      "Albatross",
      "Alchemy",
    ].map((title) => row(title));
    expect(rankTransactionTitleSuggestions("a", history)).toEqual([]);
    expect(rankTransactionTitleSuggestions("al", history)).toHaveLength(5);
  });

  it("ranks prefix before word-prefix and contains matches", () => {
    const result = rankTransactionTitleSuggestions("mar", [
      row("Supermarket"),
      row("Local market"),
      row("Market groceries"),
    ]);
    expect(result.map((item) => item.title)).toEqual([
      "Market groceries",
      "Local market",
      "Supermarket",
    ]);
  });

  it("deduplicates normalized names and uses account, frequency, then recency", () => {
    const result = rankTransactionTitleSuggestions(
      "ca",
      [
        row("Café", { accountId: "account-a", transactionDate: "2026-06-01" }),
        row("CAFE", { accountId: "account-a", transactionDate: "2026-07-01" }),
        row("Car wash", {
          accountId: "account-b",
          transactionDate: "2026-07-30",
        }),
      ],
      "account-a",
    );
    expect(result[0]).toMatchObject({
      title: "CAFE",
      usageCount: 2,
      accountId: "account-a",
    });
  });
});
