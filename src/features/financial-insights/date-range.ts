import { getLocalCalendarDate } from "@/features/transactions/utils/transaction-create-form";

/**
 * Computes a `{ from, to }` date range for a trailing-N-months preset like
 * "1m", "3m", "6m", "9m", "12m", "24m", the special "ytd" (year to date),
 * or "last_month" (the previous full calendar month only, not including
 * the current one).
 *
 * For every preset except "last_month", `to` is always the end of the
 * current month.
 *
 * Shared by every screen that offers a rolling date-range picker -- e.g.
 * the Wage Flow period picker on the Dashboard -- so they can never drift
 * into computing "last 6 months" slightly differently from each other.
 */
export function computeDateRange(preset: string, now: Date): { from: string; to: string } {
  if (preset === "last_month") {
    return {
      from: getLocalCalendarDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: getLocalCalendarDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  const start =
    preset === "ytd"
      ? new Date(now.getFullYear(), 0, 1)
      : new Date(
          now.getFullYear(),
          now.getMonth() - Number.parseInt(preset, 10) + 1,
          1,
        );
  return {
    from: getLocalCalendarDate(start),
    to: getLocalCalendarDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
