import { parseAmountInput, validateTransactionEssentials } from "./transaction-draft";

describe("parseAmountInput", () => {
  it("accepts a dot or a comma as the decimal separator", () => {
    expect(parseAmountInput("12.50")).toBe(12.5);
    expect(parseAmountInput("12,50")).toBe(12.5);
    expect(parseAmountInput(" 64,15 ")).toBe(64.15);
  });

  it("returns NaN for empty or unparsable input", () => {
    expect(parseAmountInput("")).toBeNaN();
    expect(parseAmountInput("abc")).toBeNaN();
    expect(parseAmountInput("1,2,3")).toBeNaN();
  });
});

describe("validateTransactionEssentials", () => {
  const valid = { title: "Prenda", amount: "64,15", date: "2026-11-01", accountId: "activo" };

  it("accepts a complete draft", () => {
    expect(validateTransactionEssentials(valid)).toEqual([]);
  });

  it("names every missing or invalid field", () => {
    expect(validateTransactionEssentials({ title: " ", amount: "0", date: "01/11/2026", accountId: "" })).toEqual([
      "missing_title",
      "invalid_amount",
      "invalid_date",
      "missing_account",
    ]);
  });
});
