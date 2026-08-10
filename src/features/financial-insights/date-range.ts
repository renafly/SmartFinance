/** Formats a Date as a local (not UTC) YYYY-MM-DD string, matching the
 * plain date strings `transaction_date` columns store. */
export function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
      from: localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: localDate(new Date(now.getFullYear(), now.getMonth(), 0)),
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
    from: localDate(start),
    to: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}
