import { parseAmountInput, validateTransactionEssentials, validateTransferEdit } from "./transaction-draft";

describe("parseAmountInput", () => {
  it("accepts a dot or a comma as the decimal separator", () => {
    expect(parseAmountInput("12.50")).toBe(12.5);
    expect(parseAmountInput("12,50")).toBe(12.5);
    expect(parseAmountInput(" 64,15 ")).toBe(64.15);
  });

  it("keeps accepting what Number() used to: a leading or trailing separator", () => {
    expect(parseAmountInput(".5")).toBe(0.5);
    expect(parseAmountInput(",5")).toBe(0.5);
    expect(parseAmountInput("12.")).toBe(12);
    expect(parseAmountInput("12,")).toBe(12);
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

describe("validateTransferEdit", () => {
  const valid = {
    title: "Poupança",
    amount: "100,50",
    date: "2026-11-27",
    sourceAccountId: "a1",
    destinationAccountId: "a2",
  };

  it("accepts a complete transfer with a decimal comma", () => {
    expect(validateTransferEdit(valid)).toEqual([]);
  });

  it("reports missing fields in form order", () => {
    expect(
      validateTransferEdit({ title: "", amount: "", date: "", sourceAccountId: "", destinationAccountId: "" }),
    ).toEqual(["missing_title", "invalid_amount", "invalid_date", "missing_account", "missing_destination"]);
  });

  it("rejects the same account on both sides", () => {
    expect(validateTransferEdit({ ...valid, destinationAccountId: "a1" })).toEqual(["same_account"]);
  });
});
