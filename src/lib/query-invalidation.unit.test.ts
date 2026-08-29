import { invalidateHouseholdData } from "./query-invalidation";

describe("invalidateHouseholdData", () => {
  it("invalidates every household and money query key", () => {
    const invalidateQueries = jest.fn();
    const queryClient = { invalidateQueries };

    invalidateHouseholdData(queryClient as any);

    expect(invalidateQueries).toHaveBeenCalledTimes(31);
    expect(invalidateQueries.mock.calls.map(([arg]) => arg)).toEqual([
      { queryKey: ["session"] },
      { queryKey: ["my-households"] },
      { queryKey: ["accounts"] },
      { queryKey: ["accounts-with-balances"] },
      { queryKey: ["transactions"] },
      { queryKey: ["transaction-movements"] },
      { queryKey: ["categories"] },
      { queryKey: ["attachments"] },
      { queryKey: ["recurring-transactions"] },
      { queryKey: ["recurring-expenses"] },
      { queryKey: ["recurring-expense-matches"] },
      { queryKey: ["income-sources"] },
      { queryKey: ["saving-pots"] },
      { queryKey: ["saving-pot-balances"] },
      { queryKey: ["saving-pot-accounts"] },
      { queryKey: ["household-members"] },
      { queryKey: ["household-member-details"] },
      { queryKey: ["household-invitations"] },
      { queryKey: ["my-household-invitations"] },
      { queryKey: ["monthly-budget"] },
      { queryKey: ["monthly-budget-runs"] },
      { queryKey: ["monthly-budget-income-inputs"] },
      { queryKey: ["planned-items"] },
      { queryKey: ["planned-items-preview"] },
      { queryKey: ["planned-items-resolved"] },
      { queryKey: ["planned-item-matches"] },
      { queryKey: ["planned-items-occurrences-all"] },
      { queryKey: ["monthly-budget-periods"] },
      { queryKey: ["notifications"] },
      { queryKey: ["replenishments"] },
      { queryKey: ["transaction-effective-amounts"] },
    ]);
  });
});
