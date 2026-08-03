import { listRuleOccurrences } from "./recurrence";
import type { InsightRecurringRule } from "./types";

const monthlyMultiplier = {
  daily: 365 / 12,
  weekly: 52 / 12,
  monthly: 1,
  custom: 1,
  yearly: 1 / 12,
} as const;

export function summarizeSubscriptions(rules: InsightRecurringRule[]) {
  const subscriptions = rules
    .filter(
      (rule) =>
        rule.is_active &&
        rule.type === "expense" &&
        rule.rule_kind === "transaction" &&
        rule.expense_kind === "subscription",
    )
    .map((rule) => {
      const monthlyEquivalent =
        Math.round(rule.amount * monthlyMultiplier[rule.frequency] * 100) / 100;
      return {
        ruleId: rule.id,
        title: rule.title,
        monthlyEquivalent,
        yearlyEquivalent: Math.round(monthlyEquivalent * 12 * 100) / 100,
        nextRun: rule.next_run.slice(0, 10),
      };
    })
    .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
  return {
    subscriptions,
    monthlyTotal:
      Math.round(
        subscriptions.reduce((sum, item) => sum + item.monthlyEquivalent, 0) *
          100,
      ) / 100,
    yearlyTotal:
      Math.round(
        subscriptions.reduce((sum, item) => sum + item.yearlyEquivalent, 0) *
          100,
      ) / 100,
  };
}

export function buildBillCalendar(
  rules: InsightRecurringRule[],
  from: string,
  to: string,
) {
  return rules
    .flatMap((rule) =>
      listRuleOccurrences(rule, from, to).map((date) => ({
        ruleId: rule.id,
        title: rule.title,
        date,
        amount: rule.amount,
        type: rule.type,
        accountId: rule.account_id,
        categoryId: rule.category_id ?? null,
      })),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
    );
}
