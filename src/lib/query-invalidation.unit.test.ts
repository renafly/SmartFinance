import { invalidateHouseholdData } from "./query-invalidation";

describe("invalidateHouseholdData", () => {
  it("invalidates every household and money query key", () => {
    const invalidateQueries = jest.fn();
    const queryClient = { invalidateQueries };

    invalidateHouseholdData(queryClient as any);

    expect(invalidateQueries).toHaveBeenCalledTimes(18);
    expect(invalidateQueries.mock.calls.map(([arg]) => arg)).toEqual([
      { queryKey: ["session"] },
      { queryKey: ["my-households"] },
      { queryKey: ["accounts"] },
      { queryKey: ["accounts-with-balances"] },
      { queryKey: ["transactions"] },
      { queryKey: ["categories"] },
      { queryKey: ["attachments"] },
      { queryKey: ["recurring-transactions"] },
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
    ]);
  });
});
