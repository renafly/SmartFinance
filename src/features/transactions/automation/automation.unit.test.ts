import { canonicalizeMerchant, normalizeMerchantText } from "./normalization";
import { matchTransactionRule } from "./rules";
import { validateTransactionSplits } from "./splits";
import type { TransactionRule } from "./types";

const baseRule: TransactionRule = {
  id: "rule-1",
  household_id: "household-1",
  name: "Groceries",
  match_type: "contains",
  pattern: "Continente",
  normalized_pattern: "continente",
  transaction_type: "expense",
  account_id: null,
  category_id: "groceries",
  merchant_name: "Continente",
  priority: 100,
  is_active: true,
  created_by: "profile-1",
  created_at: "2026-07-31T10:00:00.000Z",
  updated_at: "2026-07-31T10:00:00.000Z",
};

describe("transaction automation", () => {
  it("normalizes accents, punctuation, case, and whitespace", () => {
    expect(normalizeMerchantText("  CONTINÉNTE* Colombo #42 ")).toBe(
      "continente colombo 42",
    );
  });

  it("resolves exact household merchant aliases", () => {
    expect(
      canonicalizeMerchant("CONTINENTE*COLOMBO", [
        { normalized_alias: "continente colombo", merchant_name: "Continente" },
      ]),
    ).toBe("Continente");
  });

  it("applies the lowest-priority-number eligible rule", () => {
    const result = matchTransactionRule(
      {
        title: "Pagamento Continente Colombo",
        accountId: "account-1",
        type: "expense",
      },
      [
        { ...baseRule, priority: 200 },
        { ...baseRule, id: "rule-2", priority: 10 },
      ],
    );
    expect(result).toEqual({
      ruleId: "rule-2",
      categoryId: "groceries",
      merchantName: "Continente",
    });
  });

  it("ignores inactive, wrong-account, and wrong-type rules", () => {
    expect(
      matchTransactionRule(
        { title: "Continente", accountId: "account-1", type: "expense" },
        [
          { ...baseRule, is_active: false },
          { ...baseRule, account_id: "account-2" },
          { ...baseRule, transaction_type: "income" },
        ],
      ),
    ).toBeNull();
  });

  it("accepts valid split allocations within currency rounding tolerance", () => {
    expect(() =>
      validateTransactionSplits(10, [
        { amount: 6.66, category_id: "food" },
        { amount: 3.34, category_id: "home" },
      ]),
    ).not.toThrow();
  });

  it("rejects incomplete or invalid split allocations", () => {
    expect(() => validateTransactionSplits(10, [{ amount: 10 }])).toThrow(
      "at least two",
    );
    expect(() =>
      validateTransactionSplits(10, [{ amount: 8 }, { amount: 1 }]),
    ).toThrow("must equal");
    expect(() =>
      validateTransactionSplits(10, [{ amount: 11 }, { amount: -1 }]),
    ).toThrow("greater than zero");
  });
});
