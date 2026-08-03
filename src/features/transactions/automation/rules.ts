import { normalizeMerchantText } from "./normalization";
import type {
  TransactionRule,
  TransactionRuleCandidate,
  TransactionRuleResult,
} from "./types";

function titleMatches(
  title: string,
  pattern: string,
  matchType: TransactionRule["match_type"],
) {
  if (matchType === "exact") return title === pattern;
  if (matchType === "prefix") return title.startsWith(pattern);
  return title.includes(pattern);
}

export function matchTransactionRule(
  candidate: TransactionRuleCandidate,
  rules: readonly TransactionRule[],
): TransactionRuleResult | null {
  const normalizedTitle = normalizeMerchantText(candidate.title);
  if (!normalizedTitle) return null;

  const ordered = [...rules].sort(
    (left, right) =>
      left.priority - right.priority ||
      left.created_at.localeCompare(right.created_at),
  );

  const rule = ordered.find(
    (item) =>
      item.is_active &&
      (!item.account_id || item.account_id === candidate.accountId) &&
      (!item.transaction_type || item.transaction_type === candidate.type) &&
      titleMatches(normalizedTitle, item.normalized_pattern, item.match_type),
  );

  return rule
    ? {
        ruleId: rule.id,
        categoryId: rule.category_id,
        merchantName: rule.merchant_name,
      }
    : null;
}
