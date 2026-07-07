import type { QueryClient } from "@tanstack/react-query";

const HOUSEHOLD_QUERY_KEYS = [
  ["session"],
  ["my-households"],
  ["accounts"],
  ["accounts-with-balances"],
  ["transactions"],
  ["categories"],
  ["attachments"],
  ["recurring-transactions"],
  ["saving-pots"],
  ["saving-pot-balances"],
  ["saving-pot-accounts"],
  ["household-members"],
  ["household-member-details"],
  ["household-invitations"],
  ["my-household-invitations"],
  ["monthly-budget"],
  ["monthly-budget-runs"],
  ["monthly-budget-income-inputs"],
] as const;

export function invalidateHouseholdData(queryClient: QueryClient) {
  for (const queryKey of HOUSEHOLD_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
