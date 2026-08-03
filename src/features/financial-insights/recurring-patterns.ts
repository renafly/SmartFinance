import { normalizeTransactionTitle } from "@/features/transactions/category-suggestions";

import { formatCalendarDate, parseCalendarDate } from "./recurrence";
import type { InsightTransaction, RecurringFrequency } from "./types";

export type RecurringPattern = {
  merchant: string;
  accountId: string;
  categoryId: string | null;
  type: InsightTransaction["type"];
  frequency: Exclude<RecurringFrequency, "daily" | "custom">;
  averageAmount: number;
  occurrences: number;
  confidence: "high" | "medium";
  nextExpectedDate: string;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function intervalFrequency(days: number): RecurringPattern["frequency"] | null {
  if (days >= 5 && days <= 9) return "weekly";
  if (days >= 25 && days <= 35) return "monthly";
  if (days >= 330 && days <= 400) return "yearly";
  return null;
}

export function detectRecurringPatterns(transactions: InsightTransaction[]): RecurringPattern[] {
  const groups = new Map<string, InsightTransaction[]>();
  transactions.filter((item) => !item.transfer_group_id).forEach((item) => {
    const merchant = normalizeTransactionTitle(item.title);
    if (!merchant) return;
    const key = [merchant, item.account_id, item.category_id ?? "", item.type].join("|");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return [...groups.values()].flatMap((items) => {
    if (items.length < 3) return [];
    const sorted = [...items].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    const dates = sorted.map((item) => parseCalendarDate(item.transaction_date));
    if (dates.some((date) => !date)) return [];
    const intervals = dates.slice(1).map((date, index) =>
      Math.round((date!.getTime() - dates[index]!.getTime()) / 86_400_000),
    );
    const typicalDays = median(intervals);
    const frequency = intervalFrequency(typicalDays);
    if (!frequency) return [];
    const averageAmount = items.reduce((sum, item) => sum + item.amount, 0) / items.length;
    const maxDeviation = Math.max(...items.map((item) => Math.abs(item.amount - averageAmount)));
    if (averageAmount <= 0 || maxDeviation / averageAmount > 0.2) return [];
    const stableIntervals = intervals.filter((days) => Math.abs(days - typicalDays) <= Math.max(3, typicalDays * 0.15)).length;
    if (stableIntervals / intervals.length < 0.67) return [];
    const next = new Date(dates.at(-1)!);
    next.setUTCDate(next.getUTCDate() + Math.round(typicalDays));
    return [{
      merchant: normalizeTransactionTitle(items[0].title),
      accountId: items[0].account_id,
      categoryId: items[0].category_id ?? null,
      type: items[0].type,
      frequency,
      averageAmount: Math.round(averageAmount * 100) / 100,
      occurrences: items.length,
      confidence: items.length >= 4 && maxDeviation / averageAmount <= 0.1 ? "high" : "medium",
      nextExpectedDate: formatCalendarDate(next),
    }];
  });
}
