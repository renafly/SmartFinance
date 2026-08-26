import { resolveEndConditionColumns } from "./recurring-transactions.service";

describe("resolveEndConditionColumns", () => {
  it("defaults to 'never' with no end input, matching every pre-existing rule", () => {
    expect(resolveEndConditionColumns(undefined)).toEqual({
      end_condition: "never",
      end_after_occurrences: null,
      end_date: null,
    });
  });

  it("resolves an explicit 'never'", () => {
    expect(resolveEndConditionColumns({ endCondition: "never" })).toEqual({
      end_condition: "never",
      end_after_occurrences: null,
      end_date: null,
    });
  });

  it("resolves 'count' with a positive integer", () => {
    expect(
      resolveEndConditionColumns({ endCondition: "count", endAfterOccurrences: 12 }),
    ).toEqual({
      end_condition: "count",
      end_after_occurrences: 12,
      end_date: null,
    });
  });

  it("accepts the N=1 edge case", () => {
    expect(
      resolveEndConditionColumns({ endCondition: "count", endAfterOccurrences: 1 }),
    ).toEqual({
      end_condition: "count",
      end_after_occurrences: 1,
      end_date: null,
    });
  });

  it("rejects a zero occurrence count", () => {
    expect(() =>
      resolveEndConditionColumns({ endCondition: "count", endAfterOccurrences: 0 }),
    ).toThrow(/positive integer/);
  });

  it("rejects a negative occurrence count", () => {
    expect(() =>
      resolveEndConditionColumns({ endCondition: "count", endAfterOccurrences: -3 }),
    ).toThrow(/positive integer/);
  });

  it("rejects a non-integer occurrence count", () => {
    expect(() =>
      resolveEndConditionColumns({ endCondition: "count", endAfterOccurrences: 2.5 }),
    ).toThrow(/positive integer/);
  });

  it("resolves 'date' with an end date", () => {
    expect(
      resolveEndConditionColumns({ endCondition: "date", endDate: "2027-01-31" }),
    ).toEqual({
      end_condition: "date",
      end_after_occurrences: null,
      end_date: "2027-01-31",
    });
  });

  it("rejects 'date' with a missing/empty date", () => {
    expect(() =>
      resolveEndConditionColumns({ endCondition: "date", endDate: "" } as any),
    ).toThrow(/endDate is required/);
  });
});
