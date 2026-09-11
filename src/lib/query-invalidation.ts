import type { QueryClient } from "@tanstack/react-query";

const HOUSEHOLD_QUERY_KEYS = [
  ["session"],
  ["my-households"],
  ["accounts"],
  ["accounts-with-balances"],
  ["transactions"],
  ["transaction-movements"],
  ["categories"],
  ["category-budgets"],
  ["attachments"],
  ["recurring-transactions"],
  ["recurring-expenses"],
  ["recurring-expense-matches"],
  ["income-sources"],
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
  ["planned-items"],
  ["planned-items-preview"],
  ["planned-items-resolved"],
  ["planned-item-matches"],
  ["planned-items-occurrences-all"],
  ["monthly-budget-periods"],
  ["notifications"],
  ["replenishments"],
  ["transaction-effective-amounts"],
] as const;

export function invalidateHouseholdData(queryClient: QueryClient) {
  for (const queryKey of HOUSEHOLD_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
