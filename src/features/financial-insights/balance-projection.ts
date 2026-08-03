import { listRuleOccurrences } from "./recurrence";
import type { AccountBalanceInput, InsightRecurringRule } from "./types";

export function projectAccountBalances(
  accounts: AccountBalanceInput[], rules: InsightRecurringRule[], from: string, to: string,
) {
  const changes = new Map(accounts.map((account) => [account.id, 0]));
  rules.forEach((rule) => {
    const amount = rule.amount * listRuleOccurrences(rule, from, to).length;
    if (!amount) return;
    if (rule.rule_kind === "transfer") {
      changes.set(rule.account_id, (changes.get(rule.account_id) ?? 0) - amount);
      if (rule.destination_account_id) {
        changes.set(rule.destination_account_id, (changes.get(rule.destination_account_id) ?? 0) + amount);
      }
    } else {
      changes.set(rule.account_id, (changes.get(rule.account_id) ?? 0) + (rule.type === "income" ? amount : -amount));
    }
  });
  return accounts.map((account) => {
    const currentBalance = account.current_balance ?? 0;
    const change = Math.round((changes.get(account.id) ?? 0) * 100) / 100;
    return { accountId: account.id, currentBalance, change, projectedBalance: Math.round((currentBalance + change) * 100) / 100 };
  });
}
