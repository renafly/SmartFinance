// ============================================================
// Balance Forecast Engine
// ============================================================
// Projects the future balance of every bank account, savings account,
// investment account, and saving pot from the household's existing
// automation — recurring transactions/transfers and Monthly Budget rules
// (see monthly-budget.service.ts) — without requiring the user to
// configure anything new. Deliberately framework-agnostic (no React, no
// Supabase types) so the same calculation logic can be reused from the
// accounts screen, the saving pots screen, or a future Dashboard widget —
// see useBalanceForecasts.ts for the data-fetching layer that adapts
// Supabase rows into this module's input shapes.
//
// Approach: every recurring rule and Monthly Budget rule allocation is
// turned into one or two signed monthly "movements" against a specific
// account — a plain recurring income/expense is one movement, a transfer
// (recurring or Monthly Budget) is two: a debit on the source account and
// a matching credit on the destination account, dated identically. Summing
// each account's movements independently and then, for a combined view,
// summing several accounts' resulting timelines together is what keeps
// inter-account transfers from being double counted: a transfer between
// two accounts that are both in the combined set nets to zero (moving
// money between your own accounts doesn't change the total), while a
// transfer crossing the boundary of the selected set still shows up as a
// real inflow/outflow. A saving pot's forecast is not computed separately
// — it is simply the combined forecast of the pot's assigned accounts (or
// every household account when none are assigned), mirroring the
// `saving_pot_balances` view's own definition of a pot's current balance.
//
// The per-occurrence scheduling machinery (addOccurrence/getNextOccurrence
// and the frequency/excluded-month/active-month handling) mirrors
// saving-pot-forecast.service.ts, which solves the same "walk a recurring
// rule forward through a calendar" problem for pot-completion forecasts.

export type BalanceForecastFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type BalanceForecastSourceKind =
  | "recurring_income"
  | "recurring_expense"
  | "recurring_transfer"
  | "monthly_budget";

export type BalanceForecastAccount = {
  id: string;
  currentBalance: number | null | undefined;
};

/**
 * A row from `recurring_transactions`. Covers both plain recurring
 * income/expense rules (`ruleKind: "transaction"`) and recurring transfers
 * (`ruleKind: "transfer"`), matching the `recurring_rule_kind` contract
 * enforced by the `recurring_transactions_destination_shape_check`
 * constraint.
 */
export type BalanceForecastRecurringRule = {
  id: string;
  ruleKind?: "transaction" | "transfer" | null;
  type: "income" | "expense";
  accountId: string;
  destinationAccountId?: string | null;
  /** Legacy transfer destination. See resolveTransferDestinationAccountId below. */
  destinationPotId?: string | null;
  amount: number | null | undefined;
  frequency: BalanceForecastFrequency;
  isActive: boolean;
  nextRun?: string | null;
  createdAt?: string | null;
  excludedMonths?: Array<number | string> | null;
};

/** One resolved destination-account allocation from `budget_rule_allocations`. */
export type BalanceForecastRuleAllocation = {
  destinationAccountId: string | null | undefined;
  amount: number | null | undefined;
};

/**
 * A row from `budget_rules` (Monthly Budget), with its allocations already
 * joined in — see BudgetRuleWithAllocations in monthly-budget.repository.ts.
 * Monthly Budget rules always run monthly (the editor hardcodes
 * `frequency: "monthly"`), so unlike recurring rules there is no
 * `frequency`/`next_run` field here; scheduling instead anchors on
 * `createdAt` and is gated by the active-months / active-from/to window.
 */
export type BalanceForecastBudgetRule = {
  id: string;
  sourceAccountId: string | null | undefined;
  isActive: boolean;
  allocations?: BalanceForecastRuleAllocation[] | null;
  activeMonths?: Array<number | string> | null;
  activeFromMonth?: number | string | null;
  activeToMonth?: number | string | null;
  createdAt?: string | null;
};

export type BalanceForecastTimelineItem = {
  /** "YYYY-MM" */
  month: string;
  /** Signed net movement projected for this month. */
  movement: number;
  /** Running balance at the end of this month. */
  balance: number;
};

export type BalanceForecastSource = {
  kind: BalanceForecastSourceKind;
  /** Signed average monthly movement contributed by this source, over the next 12 months. */
  monthlyMovement: number;
  movementCount: number;
};

/**
 * The common shape produced for a single account and for a combination of
 * accounts (see combineBalanceForecasts) — a saving pot's forecast is a
 * CombinedBalanceForecast under the hood, but structurally identical, so
 * one UI component can render either.
 */
export type BalanceForecast = {
  currentBalance: number;
  /** Signed average monthly movement over the next 12 months (income/inflows minus expenses/outflows). */
  monthlyMovement: number;
  sources: BalanceForecastSource[];
  timeline: BalanceForecastTimelineItem[];
};

export type AccountBalanceForecast = BalanceForecast & {
  accountId: string;
};

type SavingPotAccountAssignment = {
  pot_id: string;
  account_id: string;
};

/** Internal representation: one signed, schedulable movement against one account. */
type Movement = {
  accountId: string;
  kind: BalanceForecastSourceKind;
  /** Signed — already includes direction (negative for a debit/expense, positive for a credit/income). */
  amount: number;
  frequency: BalanceForecastFrequency;
  firstRun: Date;
  excludedMonths: number[];
  activeMonths: number[];
  activeFromMonth: number | null;
  activeToMonth: number | null;
  // "YYYY-MM" for the one calendar month this movement must be treated as
  // already reflected in the account's current balance, or null. Set when a
  // Monthly Budget rule has already been confirmed/run for the current
  // month — see buildAccountBalanceForecasts's confirmedBudgetRuleIds.
  skipMonthKey: string | null;
};

const DEFAULT_HORIZON_MONTHS = 24;
const MAX_HORIZON_MONTHS = 30 * 12;

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function parseUtcDate(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(date: Date, months: number) {
  const targetMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();

  targetMonthStart.setUTCDate(Math.min(date.getUTCDate(), daysInTargetMonth));
  return targetMonthStart;
}

function addOccurrence(date: Date, frequency: BalanceForecastFrequency) {
  switch (frequency) {
    case "daily":
      return new Date(date.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "yearly":
      return addMonths(date, 12);
    case "monthly":
    case "custom":
      return addMonths(date, 1);
  }
}

function normalizeMonthList(months: Array<number | string> | null | undefined) {
  if (!Array.isArray(months)) return [];

  return [
    ...new Set(
      months.map((month) => Number(month)).filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
    ),
  ];
}

function normalizeMonth(value: number | string | null | undefined) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function isMonthWithinWindow(month: number, start: number, end: number) {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

function isIncludedOccurrence(movement: Movement, date: Date) {
  const month = date.getUTCMonth() + 1;

  if (movement.skipMonthKey && monthKey(date) === movement.skipMonthKey) {
    return false;
  }

  if (movement.frequency === "custom" && movement.excludedMonths.includes(month)) {
    return false;
  }

  if (movement.kind !== "monthly_budget") return true;

  if (movement.activeMonths.length > 0 && !movement.activeMonths.includes(month)) {
    return false;
  }

  if (movement.activeFromMonth !== null || movement.activeToMonth !== null) {
    if (movement.activeFromMonth === null || movement.activeToMonth === null) return false;
    return isMonthWithinWindow(month, movement.activeFromMonth, movement.activeToMonth);
  }

  return true;
}

function getNextOccurrence(movement: Movement, after: Date, horizon: Date) {
  let occurrence = movement.firstRun;
  let guard = 0;

  while (occurrence < after && guard < 20_000) {
    occurrence = addOccurrence(occurrence, movement.frequency);
    guard += 1;
  }

  while (!isIncludedOccurrence(movement, occurrence) && occurrence <= horizon && guard < 20_000) {
    occurrence = addOccurrence(occurrence, movement.frequency);
    guard += 1;
  }

  return occurrence <= horizon ? occurrence : null;
}

/**
 * Averages a movement's occurrences over the 12 months following `asOf`.
 * This window is intentionally independent of the timeline/scheduling
 * `horizon` passed elsewhere (which may be as short as 3 months for a UI
 * period selector) — a "monthly movement" figure should mean the same
 * thing regardless of how many months the caller chose to display, so the
 * occurrence search here always looks a full year ahead.
 */
function averageMonthlyMovement(movement: Movement, asOf: Date) {
  const oneYearLater = addMonths(asOf, 12);
  let total = 0;
  let occurrence = getNextOccurrence(movement, asOf, oneYearLater);
  let guard = 0;

  while (occurrence && occurrence < oneYearLater && guard < 20_000) {
    total = roundMoney(total + movement.amount);
    occurrence = getNextOccurrence(movement, addOccurrence(occurrence, movement.frequency), oneYearLater);
    guard += 1;
  }

  return roundMoney(total / 12);
}

/**
 * A recurring transfer's destination may be a saving pot instead of an
 * account (`destination_pot_id`) — a legacy shape the editor no longer
 * writes but still has to schedule correctly. The execution engine
 * (execute-recurring-movements) resolves this to the pot's earliest
 * assigned account; `savingPotAccountAssignments` is expected in that same
 * order (the repository already lists assignments ordered by
 * `created_at`), so taking the first match here mirrors that behavior.
 */
function resolveTransferDestinationAccountId(
  rule: BalanceForecastRecurringRule,
  potAccountsByPotId: Map<string, string[]>,
) {
  if (rule.destinationAccountId) return rule.destinationAccountId;
  if (rule.destinationPotId) return potAccountsByPotId.get(rule.destinationPotId)?.[0] ?? null;
  return null;
}

function buildMovementsFromRecurringRule(
  rule: BalanceForecastRecurringRule,
  potAccountsByPotId: Map<string, string[]>,
): Movement[] {
  if (!rule.isActive || !rule.accountId) return [];

  const amount = roundMoney(Number(rule.amount));
  if (!Number.isFinite(amount) || amount <= 0) return [];

  const firstRun = parseUtcDate(rule.nextRun) ?? parseUtcDate(rule.createdAt);
  if (!firstRun) return [];

  const base = {
    frequency: rule.frequency,
    firstRun,
    excludedMonths: normalizeMonthList(rule.excludedMonths),
    activeMonths: [] as number[],
    activeFromMonth: null,
    activeToMonth: null,
    skipMonthKey: null,
  } satisfies Omit<Movement, "accountId" | "kind" | "amount">;

  if ((rule.ruleKind ?? "transaction") === "transfer") {
    const destinationAccountId = resolveTransferDestinationAccountId(rule, potAccountsByPotId);
    if (!destinationAccountId || destinationAccountId === rule.accountId) return [];

    return [
      { ...base, accountId: rule.accountId, kind: "recurring_transfer", amount: -amount },
      { ...base, accountId: destinationAccountId, kind: "recurring_transfer", amount },
    ];
  }

  return [
    {
      ...base,
      accountId: rule.accountId,
      kind: rule.type === "income" ? "recurring_income" : "recurring_expense",
      amount: rule.type === "income" ? amount : -amount,
    },
  ];
}

function buildMovementsFromBudgetRule(
  rule: BalanceForecastBudgetRule,
  asOf: Date,
  currentMonthKey: string,
  confirmedRuleIds: Set<string>,
): Movement[] {
  if (!rule.isActive || !rule.sourceAccountId) return [];

  const allocations = rule.allocations ?? [];
  if (allocations.length === 0) return [];

  // Monthly Budget rules carry no next_run column — a rule contributes
  // starting the month it was created (or, absent that, starting now).
  const firstRun = parseUtcDate(rule.createdAt) ?? asOf;
  const skipMonthKey = confirmedRuleIds.has(rule.id) ? currentMonthKey : null;
  const base = {
    frequency: "monthly" as const,
    firstRun,
    excludedMonths: [] as number[],
    activeMonths: normalizeMonthList(rule.activeMonths),
    activeFromMonth: normalizeMonth(rule.activeFromMonth),
    activeToMonth: normalizeMonth(rule.activeToMonth),
    skipMonthKey,
  } satisfies Omit<Movement, "accountId" | "kind" | "amount">;

  const movements: Movement[] = [];

  for (const allocation of allocations) {
    const amount = roundMoney(Number(allocation.amount));
    if (!allocation.destinationAccountId || !Number.isFinite(amount) || amount <= 0) continue;
    if (allocation.destinationAccountId === rule.sourceAccountId) continue;

    movements.push({ ...base, accountId: rule.sourceAccountId, kind: "monthly_budget", amount: -amount });
    movements.push({ ...base, accountId: allocation.destinationAccountId, kind: "monthly_budget", amount });
  }

  return movements;
}

function buildBalanceTimeline(
  movements: Movement[],
  currentBalance: number,
  asOf: Date,
  horizon: Date,
  horizonMonths: number,
): BalanceForecastTimelineItem[] {
  const nextOccurrences = movements.map((movement) => getNextOccurrence(movement, asOf, horizon));
  const timeline: BalanceForecastTimelineItem[] = [];
  let balance = currentBalance;
  let monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));

  for (let i = 0; i < horizonMonths; i += 1) {
    const nextMonthStart = addMonths(monthStart, 1);
    let movementTotal = 0;

    nextOccurrences.forEach((occurrence, index) => {
      while (occurrence && occurrence < nextMonthStart) {
        movementTotal = roundMoney(movementTotal + movements[index].amount);
        nextOccurrences[index] = getNextOccurrence(
          movements[index],
          addOccurrence(occurrence, movements[index].frequency),
          horizon,
        );
        occurrence = nextOccurrences[index];
      }
    });

    balance = roundMoney(balance + movementTotal);
    timeline.push({ month: monthStart.toISOString().slice(0, 7), movement: movementTotal, balance });
    monthStart = nextMonthStart;
  }

  return timeline;
}

const SOURCE_KINDS: BalanceForecastSourceKind[] = [
  "recurring_income",
  "recurring_expense",
  "recurring_transfer",
  "monthly_budget",
];

function summarizeSources(movements: Movement[], asOf: Date): BalanceForecastSource[] {
  return SOURCE_KINDS.flatMap((kind) => {
    const matching = movements.filter((movement) => movement.kind === kind);
    if (matching.length === 0) return [];

    return [
      {
        kind,
        monthlyMovement: roundMoney(
          matching.reduce((sum, movement) => sum + averageMonthlyMovement(movement, asOf), 0),
        ),
        movementCount: matching.length,
      } satisfies BalanceForecastSource,
    ];
  });
}

/**
 * Projects every household account's balance forward from its current
 * balance, using its active recurring rules and Monthly Budget rule
 * allocations. Returns one forecast per account in `input.accounts`, keyed
 * by account id — accounts with no active rules still get a (flat)
 * forecast, so callers don't need to special-case them.
 */
export function buildAccountBalanceForecasts(input: {
  accounts: BalanceForecastAccount[];
  recurringRules: BalanceForecastRecurringRule[];
  budgetRules: BalanceForecastBudgetRule[];
  savingPotAccountAssignments?: SavingPotAccountAssignment[];
  /**
   * Monthly Budget rule ids already confirmed/run for the current month
   * (via a `monthly_budget_runs` row) — their allocations already moved
   * real money and are reflected in the accounts' current balances, so
   * this month's occurrence must be skipped to avoid counting it twice.
   * See useSavingPotForecasts for the same pattern.
   */
  confirmedBudgetRuleIdsForCurrentMonth?: Iterable<string>;
  /** Number of months to project. Clamped to [1, 360]. Defaults to 24. */
  horizonMonths?: number;
  asOf?: Date;
}): Map<string, AccountBalanceForecast> {
  const asOf = input.asOf
    ? new Date(Date.UTC(input.asOf.getUTCFullYear(), input.asOf.getUTCMonth(), input.asOf.getUTCDate()))
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const horizonMonths = Math.max(1, Math.min(input.horizonMonths ?? DEFAULT_HORIZON_MONTHS, MAX_HORIZON_MONTHS));
  const horizon = addMonths(asOf, horizonMonths);
  const currentMonthKey = monthKey(asOf);
  const confirmedRuleIds = new Set(input.confirmedBudgetRuleIdsForCurrentMonth ?? []);

  const potAccountsByPotId = new Map<string, string[]>();
  for (const assignment of input.savingPotAccountAssignments ?? []) {
    const list = potAccountsByPotId.get(assignment.pot_id) ?? [];
    list.push(assignment.account_id);
    potAccountsByPotId.set(assignment.pot_id, list);
  }

  const movements = [
    ...input.recurringRules.flatMap((rule) => buildMovementsFromRecurringRule(rule, potAccountsByPotId)),
    ...input.budgetRules.flatMap((rule) => buildMovementsFromBudgetRule(rule, asOf, currentMonthKey, confirmedRuleIds)),
  ];

  const movementsByAccountId = new Map<string, Movement[]>();
  for (const movement of movements) {
    const list = movementsByAccountId.get(movement.accountId) ?? [];
    list.push(movement);
    movementsByAccountId.set(movement.accountId, list);
  }

  return new Map(
    input.accounts.map((account): [string, AccountBalanceForecast] => {
      const currentBalance = roundMoney(Number(account.currentBalance ?? 0));
      const accountMovements = movementsByAccountId.get(account.id) ?? [];
      const sources = summarizeSources(accountMovements, asOf);
      const monthlyMovement = roundMoney(sources.reduce((sum, source) => sum + source.monthlyMovement, 0));
      const timeline = buildBalanceTimeline(accountMovements, currentBalance, asOf, horizon, horizonMonths);

      return [
        account.id,
        {
          accountId: account.id,
          currentBalance,
          monthlyMovement,
          sources,
          timeline,
        },
      ];
    }),
  );
}

/**
 * Sums several timelines index-by-index (same-length, month-aligned
 * timelines are assumed, which holds for every timeline this module
 * produces since they all share one horizon) — the piece of
 * combineBalanceForecasts that's also reused, on its own, to aggregate the
 * User → Account Type → Individual Account breakdown tree (see
 * buildForecastBreakdown in ui-utils.ts): an "Account Type" node's timeline
 * is just its member accounts' timelines combined, and a "User" node's
 * timeline is its type nodes' timelines combined, one level up.
 */
export function combineTimelines(timelines: BalanceForecastTimelineItem[][]): BalanceForecastTimelineItem[] {
  const length = Math.max(0, ...timelines.map((timeline) => timeline.length));

  return Array.from({ length }, (_, index) => ({
    month: timelines.find((timeline) => timeline[index])?.[index]?.month ?? "",
    movement: roundMoney(timelines.reduce((sum, timeline) => sum + (timeline[index]?.movement ?? 0), 0)),
    balance: roundMoney(timelines.reduce((sum, timeline) => sum + (timeline[index]?.balance ?? 0), 0)),
  }));
}

/**
 * Combines several accounts' forecasts into one — the basis for both a
 * saving pot's forecast (the combination of its assigned accounts) and a
 * user-filtered "combined forecast" across any set of accounts. A transfer
 * between two accounts that are both present in `forecasts` nets to zero
 * automatically, since each side was already recorded as an opposite-signed
 * movement on its own account — see the module-level comment above.
 */
export function combineBalanceForecasts(forecasts: BalanceForecast[]): BalanceForecast {
  if (forecasts.length === 0) {
    return { currentBalance: 0, monthlyMovement: 0, sources: [], timeline: [] };
  }

  const currentBalance = roundMoney(forecasts.reduce((sum, forecast) => sum + forecast.currentBalance, 0));
  const monthlyMovement = roundMoney(forecasts.reduce((sum, forecast) => sum + forecast.monthlyMovement, 0));

  const sourceTotals = new Map<BalanceForecastSourceKind, BalanceForecastSource>();
  for (const forecast of forecasts) {
    for (const source of forecast.sources) {
      const current = sourceTotals.get(source.kind) ?? {
        kind: source.kind,
        monthlyMovement: 0,
        movementCount: 0,
      };
      sourceTotals.set(source.kind, {
        kind: source.kind,
        monthlyMovement: roundMoney(current.monthlyMovement + source.monthlyMovement),
        movementCount: current.movementCount + source.movementCount,
      });
    }
  }

  const timelineLength = Math.max(0, ...forecasts.map((forecast) => forecast.timeline.length));
  const timeline: BalanceForecastTimelineItem[] = Array.from({ length: timelineLength }, (_, index) => ({
    month: forecasts.find((forecast) => forecast.timeline[index])?.timeline[index]?.month ?? "",
    movement: roundMoney(forecasts.reduce((sum, forecast) => sum + (forecast.timeline[index]?.movement ?? 0), 0)),
    balance: roundMoney(forecasts.reduce((sum, forecast) => sum + (forecast.timeline[index]?.balance ?? forecast.currentBalance), 0)),
  }));

  return {
    currentBalance,
    monthlyMovement,
    sources: SOURCE_KINDS.flatMap((kind) => sourceTotals.get(kind) ?? []),
    timeline,
  };
}

export const balanceForecastConstants = {
  DEFAULT_HORIZON_MONTHS,
  MAX_HORIZON_MONTHS,
};
