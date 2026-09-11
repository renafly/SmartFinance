/**
 * Shared "is this due in month X" predicate, used by both recurring
 * expenses and income sources (see supabase/migrations/20260901000800 and
 * 20260901001000) -- previously each list computed its own version of this
 * question independently. `budget_rules` still uses its own two-mechanism
 * active_months/active_from_month/active_to_month check
 * (isBudgetRuleActiveForMonth in monthly-budget.service.ts) and was left
 * alone, since it already works and touching it wasn't necessary for this
 * change.
 */

export type RecurrenceType = "monthly" | "specific_months" | "interval" | "one_time";

/**
 * Minimal shape this predicate needs. `recurring_expenses` and
 * `income_sources` rows (and their in-progress form drafts) both satisfy
 * this shape directly.
 */
export type RecurrenceLike = {
  recurrence_type: RecurrenceType;
  recurrence_months: number[] | readonly number[] | null;
  recurrence_interval_months: number | null;
  /** Only meaningful for recurrence_type = "one_time": the single month
   * (any ISO date/month string) this occurs in. */
  one_time_month?: string | null;
  start_date: string;
  end_date: string | null;
  is_paused: boolean;
};

/** Normalizes any ISO date/month string to "YYYY-MM". */
export function toYearMonth(value: string) {
  return value.slice(0, 7);
}

/**
 * Whether `item` is expected to occur in `month` ("YYYY-MM" or a full ISO
 * date -- only the year/month is read). Pure and stateless: unlike
 * `recurring_transactions`' next_run/last_run pointer, this can be asked
 * about any month, past or future.
 */
export function isDueInMonth(item: RecurrenceLike, month: string): boolean {
  if (item.is_paused) return false;

  const target = toYearMonth(month);

  if (item.recurrence_type === "one_time") {
    // A one-time item isn't gated by start_date/end_date -- it simply
    // happens (or doesn't) in its own configured month.
    return !!item.one_time_month && toYearMonth(item.one_time_month) === target;
  }

  const start = toYearMonth(item.start_date);
  if (target < start) return false;
  if (item.end_date && target > toYearMonth(item.end_date)) return false;

  switch (item.recurrence_type) {
    case "monthly":
      return true;

    case "specific_months": {
      const monthNumber = Number(target.slice(5, 7));
      const months = Array.isArray(item.recurrence_months) ? item.recurrence_months.map(Number) : [];
      return months.includes(monthNumber);
    }

    case "interval": {
      const interval = Number(item.recurrence_interval_months ?? 0);
      if (!Number.isFinite(interval) || interval <= 0) return false;

      const startYear = Number(start.slice(0, 4));
      const startMonth = Number(start.slice(5, 7));
      const targetYear = Number(target.slice(0, 4));
      const targetMonth = Number(target.slice(5, 7));
      const monthsElapsed = (targetYear - startYear) * 12 + (targetMonth - startMonth);

      return monthsElapsed >= 0 && monthsElapsed % interval === 0;
    }

    default:
      return false;
  }
}

const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Short, human-readable recurrence summary, e.g. "Every month", "Mar, Jun, Sep, Dec", "Every 2 months", "One-time (Dec 2026)". Purely for display; translated labels are applied by the caller when available. */
export function formatRecurrenceSummary(item: RecurrenceLike): string {
  if (item.recurrence_type === "monthly") return "Every month";

  if (item.recurrence_type === "specific_months") {
    const months = Array.isArray(item.recurrence_months)
      ? [...item.recurrence_months].map(Number).sort((a, b) => a - b)
      : [];
    return months.map((month) => MONTH_ABBREVIATIONS[month - 1] ?? String(month)).join(", ");
  }

  if (item.recurrence_type === "interval") {
    const interval = Number(item.recurrence_interval_months ?? 0);
    return `Every ${interval} months`;
  }

  if (item.recurrence_type === "one_time") {
    if (!item.one_time_month) return "One-time";
    const [year, month] = toYearMonth(item.one_time_month).split("-").map(Number);
    return `One-time (${MONTH_ABBREVIATIONS[(month ?? 1) - 1] ?? month} ${year})`;
  }

  return "";
}

/** First-of-month ISO date for a "YYYY-MM" (or full date) string. */
export function toOccurrenceMonthDate(month: string) {
  return `${toYearMonth(month)}-01`;
}
