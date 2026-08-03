import type { InsightRecurringRule, RecurringFrequency } from "./types";

export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addRecurrence(date: Date, frequency: RecurringFrequency): Date {
  const next = new Date(date);
  if (frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (frequency === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

export function listRuleOccurrences(
  rule: InsightRecurringRule,
  from: string,
  to: string,
): string[] {
  if (!rule.is_active) return [];
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  let occurrence = parseCalendarDate(rule.next_run);
  if (!start || !end || !occurrence || start > end) return [];
  const result: string[] = [];
  let guard = 0;
  while (occurrence <= end && guard < 1000) {
    const month = occurrence.getUTCMonth() + 1;
    if (occurrence >= start && !(rule.excluded_months ?? []).includes(month)) {
      result.push(formatCalendarDate(occurrence));
    }
    occurrence = addRecurrence(occurrence, rule.frequency);
    guard += 1;
  }
  return result;
}
