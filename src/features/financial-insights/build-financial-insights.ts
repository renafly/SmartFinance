import { projectAccountBalances } from "./balance-projection";
import { buildBillCalendar, summarizeSubscriptions } from "./recurring-insights";
import { detectRecurringPatterns } from "./recurring-patterns";
import { calculateCashFlowReport, calculateCategorySpending, calculateMerchantSpending } from "./reports";
import type { AccountBalanceInput, InsightRecurringRule, InsightTransaction } from "./types";

export type BuildFinancialInsightsInput = {
  transactions: InsightTransaction[];
  recurringRules: InsightRecurringRule[];
  accounts: AccountBalanceInput[];
  from: string;
  to: string;
};

/** Composes query results from the existing transactions, recurring, and account hooks. */
export function buildFinancialInsights(input: BuildFinancialInsightsInput) {
  const range = { from: input.from, to: input.to };
  return {
    cashFlow: calculateCashFlowReport(input.transactions, range),
    categorySpending: calculateCategorySpending(input.transactions, range),
    merchantSpending: calculateMerchantSpending(input.transactions, range),
    detectedRecurringPatterns: detectRecurringPatterns(input.transactions),
    subscriptions: summarizeSubscriptions(input.recurringRules),
    billCalendar: buildBillCalendar(input.recurringRules, input.from, input.to),
    projectedAccountBalances: projectAccountBalances(input.accounts, input.recurringRules, input.from, input.to),
  };
}
