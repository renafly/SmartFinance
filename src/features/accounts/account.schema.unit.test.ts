import { accountSchema } from "./account.schema";

describe("accountSchema", () => {
  it("trims names and coerces the initial balance", () => {
    const result = accountSchema.parse({
      name: "  Emergency fund  ",
      type: "savings",
      currency: "EUR",
      initial_balance: "1250.45",
      owner_profile_id: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toEqual({
      name: "Emergency fund",
      type: "savings",
      currency: "EUR",
      initial_balance: 1250.45,
      owner_profile_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("allows an unassigned owner and rejects invalid money fields", () => {
    expect(
      accountSchema.parse({
        name: "Cash wallet",
        type: "cash",
        currency: "GBP",
        initial_balance: 0,
        owner_profile_id: null,
      }),
    ).toMatchObject({ owner_profile_id: null, initial_balance: 0 });

    expect(() =>
      accountSchema.parse({
        name: "Debt bucket",
        type: "bank",
        currency: "EUR",
        initial_balance: "-1",
      }),
    ).toThrow("Balance cannot be negative");
  });

  it("rejects empty names and unsupported account types or currencies", () => {
    expect(() =>
      accountSchema.parse({
        name: "   ",
        type: "bank",
        currency: "EUR",
        initial_balance: "10",
      }),
    ).toThrow("Account name is required");

    expect(() =>
      accountSchema.parse({
        name: "Retirement",
        type: "ppr",
        currency: "EUR",
        initial_balance: "10",
      }),
    ).toThrow();

    expect(() =>
      accountSchema.parse({
        name: "Brokerage",
        type: "investment",
        currency: "CHF",
        initial_balance: "10",
      }),
    ).toThrow();
  });
});
