import { roundMoney } from "@/features/planned-items/utils";

export type ForecastFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type SavingPotForecastUnavailableReason =
  | "missing_target"
  | "no_active_contributions"
  | "beyond_horizon";

export type SavingPotForecastSource = {
  kind: "recurring_transfer" | "monthly_budget";
  monthlyContribution: number;
  contributionCount: number;
};

export type SavingPotForecastTimelineItem = {
  month: string;
  contribution: number;
  projectedAmount: number;
  remainingAmount: number;
  reachedTarget: boolean;
};

export type SavingPotForecast = {
  potId: string;
  currentAmount: number;
  targetAmount: number | null;
  remainingAmount: number;
  monthlyContribution: number;
  sources: SavingPotForecastSource[];
  timeline: SavingPotForecastTimelineItem[];
  completionDate: string | null;
  unavailableReason: SavingPotForecastUnavailableReason | null;
};

type ForecastPot = {
  id: string;
  targetAmount: number | null | undefined;
  currentAmount: number | null | undefined;
};

/**
 * One destination-account allocation belonging to a monthly budget rule
 * (`budget_rule_allocations`). A rule's total amount only lives at the rule
 * level for historical/UI purposes — the *resolved*, per-account amount that
 * actually gets transferred is what's stored on each allocation, for both
 * `equal_split` and `custom` modes. See flattenRuleAllocations below.
 */
type ForecastRuleAllocation = {
  destination_account_id: string;
  amount: number | null | undefined;
};

type ForecastRule = {
  id: string;
  account_id?: string | null;
  source_account_id?: string | null;
  destination_pot_id?: string | null;
  destination_account_id?: string | null;
  /**
   * Multi-account allocations for a monthly budget rule. When present, the
   * rule's own `amount`/`destination_account_id` are ignored in favor of one
   * contribution per allocation — a rule that splits "Investments: €200"
   * across four accounts must be detected as four separate €50 transfers,
   * each attributed to its own destination account/pot.
   */
  allocations?: ForecastRuleAllocation[] | null;
  section?: string | null;
  amount: number | null | undefined;
  frequency: ForecastFrequency;
  is_active: boolean;
  next_run?: string | null;
  created_at?: string | null;
  excluded_months?: Array<number | string> | null;
  active_months?: Array<number | string> | null;
  active_from_month?: number | string | null;
  active_to_month?: number | string | null;
  /**
   * Fixed calendar months (["YYYY-MM", ...]) this contribution is due in,
   * precomputed via the Planned Items resolver's isPlannedItemDueInMonth
   * (see planned-item-forecast-contributions.ts) -- set only for
   * planned-item-derived monthly_budget rules. When present this replaces
   * the frequency/next_run/active_months walk entirely for scheduling,
   * since planned_items recurrence (monthly, specific_months, interval,
   * one_time) has no equivalent in the legacy frequency model above.
   */
  dueMonthKeys?: string[] | null;
  /**
   * Calendar months ("YYYY-MM") whose real planned_item_occurrence is
   * already confirmed/matched (money already moved, already reflected in
   * the pot's current balance) or skipped/cancelled (money will never
   * move that month) -- must never be projected as a still-upcoming
   * contribution. Data-driven per month, not just "the current calendar
   * month": a reverted occurrence goes back to 'planned' and is
   * automatically eligible again the next time this is recomputed.
   */
  skipMonthKeys?: string[] | null;
};

type RecurringTransferRule = ForecastRule & {
  rule_kind?: "transaction" | "transfer" | null;
};

type ForecastContribution = {
  kind: SavingPotForecastSource["kind"];
  amount: number;
  frequency: ForecastFrequency;
  firstRun: Date;
  excludedMonths: number[];
  activeMonths: number[];
  activeFromMonth: number | null;
  activeToMonth: number | null;
  // Sorted "YYYY-MM" months this contribution occurs in, or null to fall
  // back to the frequency/next_run walk below (recurring transfers, and
  // any legacy rule with no precomputed schedule). See ForecastRule's
  // dueMonthKeys doc comment.
  dueMonthKeys: string[] | null;
  // Calendar months already collected/settled and never projected again --
  // see ForecastRule's skipMonthKeys doc comment.
  skipMonthKeys: Set<string>;
};

type SavingPotAccountAssignment = {
  pot_id: string;
  account_id: string;
};

const FORECAST_HORIZON_MONTHS = 30 * 12;

function parseUtcDate(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(date: Date, months: number) {
  const targetMonthStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const daysInTargetMonth = new Date(
    Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();

  targetMonthStart.setUTCDate(Math.min(date.getUTCDate(), daysInTargetMonth));
  return targetMonthStart;
}

function addOccurrence(date: Date, frequency: ForecastFrequency) {
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

function normalizeExcludedMonths(months: ForecastRule["excluded_months"]) {
  if (!Array.isArray(months)) return [];

  return months
    .map((month) => Number(month))
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
}

function normalizeActiveMonths(months: ForecastRule["active_months"]) {
  if (!Array.isArray(months)) return [];

  return [...new Set(
    months
      .map((month) => Number(month))
      .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12),
  )];
}

function normalizeMonth(value: number | string | null | undefined) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function isMonthWithinWindow(month: number, start: number, end: number) {
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

function isIncludedOccurrence(contribution: ForecastContribution, date: Date) {
  const month = date.getUTCMonth() + 1;

  if (contribution.skipMonthKeys.has(monthKey(date))) {
    return false;
  }

  if (contribution.frequency === "custom" && contribution.excludedMonths.includes(month)) {
    return false;
  }

  if (contribution.kind !== "monthly_budget") return true;
  if (contribution.activeMonths.length > 0 && !contribution.activeMonths.includes(month)) {
    return false;
  }

  if (contribution.activeFromMonth !== null || contribution.activeToMonth !== null) {
    if (contribution.activeFromMonth === null || contribution.activeToMonth === null) return false;
    return isMonthWithinWindow(month, contribution.activeFromMonth, contribution.activeToMonth);
  }

  return true;
}

function getNextOccurrence(
  contribution: ForecastContribution,
  after: Date,
  horizon: Date,
) {
  if (contribution.dueMonthKeys) {
    const afterKey = monthKey(after);
    for (const key of contribution.dueMonthKeys) {
      if (key < afterKey) continue;
      if (contribution.skipMonthKeys.has(key)) continue;
      const date = parseUtcDate(`${key}-01`);
      return date && date <= horizon ? date : null;
    }
    return null;
  }

  let occurrence = contribution.firstRun;
  let guard = 0;

  while (occurrence < after && guard < 20_000) {
    occurrence = addOccurrence(occurrence, contribution.frequency);
    guard += 1;
  }

  while (!isIncludedOccurrence(contribution, occurrence) && occurrence <= horizon && guard < 20_000) {
    occurrence = addOccurrence(occurrence, contribution.frequency);
    guard += 1;
  }

  return occurrence <= horizon ? occurrence : null;
}

function monthlyContribution(
  contribution: ForecastContribution,
  asOf: Date,
  horizon: Date,
) {
  const oneYearLater = addMonths(asOf, 12);
  let total = 0;
  let occurrence = getNextOccurrence(contribution, asOf, horizon);
  let guard = 0;

  while (occurrence && occurrence < oneYearLater && guard < 20_000) {
    total = roundMoney(total + contribution.amount);
    occurrence = getNextOccurrence(
      contribution,
      addOccurrence(occurrence, contribution.frequency),
      horizon,
    );
    guard += 1;
  }

  return roundMoney(total / 12);
}

function toContribution(
  rule: ForecastRule,
  kind: SavingPotForecastSource["kind"],
  fallbackStart: Date,
) {
  const amount = roundMoney(Number(rule.amount));
  const firstRun = parseUtcDate(rule.next_run) ?? parseUtcDate(rule.created_at) ?? fallbackStart;

  if (!Number.isFinite(amount) || amount <= 0 || !firstRun) return null;

  const dueMonthKeys =
    rule.dueMonthKeys && rule.dueMonthKeys.length > 0 ? [...rule.dueMonthKeys].sort() : null;

  return {
    kind,
    amount,
    frequency: rule.frequency,
    firstRun,
    excludedMonths: normalizeExcludedMonths(rule.excluded_months),
    activeMonths: normalizeActiveMonths(rule.active_months),
    activeFromMonth: normalizeMonth(rule.active_from_month),
    activeToMonth: normalizeMonth(rule.active_to_month),
    dueMonthKeys,
    skipMonthKeys: new Set(rule.skipMonthKeys ?? []),
  } satisfies ForecastContribution;
}

function ruleTargetsPotThroughDestinationAccount(
  rule: ForecastRule,
  potId: string,
  potIdsByAccountId: Map<string, string[]>,
) {
  if (!rule.destination_account_id) return false;

  // Treat legacy duplicate assignments as ambiguous instead of inflating
  // multiple pots. The database constraint will prevent new duplicates.
  const matchingPotIds = potIdsByAccountId.get(rule.destination_account_id) ?? [];
  return matchingPotIds.length === 1 && matchingPotIds[0] === potId;
}

function isContributionFromOutsidePot(
  rule: ForecastRule,
  potId: string,
  potIdsByAccountId: Map<string, string[]>,
) {
  const sourceAccountId = rule.source_account_id ?? rule.account_id;
  if (!sourceAccountId) return true;

  return !(potIdsByAccountId.get(sourceAccountId) ?? []).includes(potId);
}

function ruleContributesToPot(
  rule: ForecastRule,
  potId: string,
  potIdsByAccountId: Map<string, string[]>,
) {
  if (!isContributionFromOutsidePot(rule, potId, potIdsByAccountId)) return false;

  if (rule.destination_account_id) {
    return ruleTargetsPotThroughDestinationAccount(rule, potId, potIdsByAccountId);
  }

  // Keep forecasts useful for pre-account-destination rules imported from an
  // older backup. New rules must always select an account destination.
  return rule.destination_pot_id === potId;
}

/**
 * A monthly budget rule can fan out across N destination accounts via
 * `budget_rule_allocations` (equal_split or custom) instead of carrying a
 * single destination/amount pair. Every allocation is an independent
 * transfer with its own resolved amount, so it must be treated as an
 * independent contribution to whichever pot owns that destination account —
 * summing the rule's total against one pot would both misattribute money to
 * the wrong pot and miss the others entirely.
 *
 * Rules without an `allocations` array (recurring transfers, which have no
 * such concept, or legacy single-destination rules) pass through unchanged
 * so this is a safe no-op for every other caller.
 */
function flattenRuleAllocations(rules: ForecastRule[]): ForecastRule[] {
  return rules.flatMap((rule) => {
    if (!rule.allocations || rule.allocations.length === 0) return [rule];

    return rule.allocations.map((allocation) => ({
      ...rule,
      destination_account_id: allocation.destination_account_id,
      amount: allocation.amount,
    }));
  });
}

function findCompletionDate(
  contributions: ForecastContribution[],
  remainingAmount: number,
  asOf: Date,
  horizon: Date,
) {
  const nextOccurrences = contributions.map((contribution) =>
    getNextOccurrence(contribution, asOf, horizon),
  );
  let remaining = remainingAmount;
  let guard = 0;

  while (guard < 50_000) {
    const nextDate = nextOccurrences.reduce<Date | null>((earliest, occurrence) => {
      if (!occurrence) return earliest;
      return !earliest || occurrence < earliest ? occurrence : earliest;
    }, null);

    if (!nextDate) return null;

    nextOccurrences.forEach((occurrence, index) => {
      if (!occurrence || occurrence.getTime() !== nextDate.getTime()) return;
      remaining = roundMoney(remaining - contributions[index].amount);
      nextOccurrences[index] = getNextOccurrence(
        contributions[index],
        addOccurrence(occurrence, contributions[index].frequency),
        horizon,
      );
    });

    if (remaining <= 0) return toDateKey(nextDate);
    guard += 1;
  }

  return null;
}

function buildForecastTimeline(
  contributions: ForecastContribution[],
  currentAmount: number,
  targetAmount: number,
  asOf: Date,
  horizon: Date,
) {
  const nextOccurrences = contributions.map((contribution) =>
    getNextOccurrence(contribution, asOf, horizon),
  );
  const timeline: SavingPotForecastTimelineItem[] = [];
  let projectedAmount = currentAmount;
  let monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  let guard = 0;

  while (monthStart <= horizon && projectedAmount < targetAmount && guard < FORECAST_HORIZON_MONTHS) {
    const nextMonthStart = addMonths(monthStart, 1);
    let contribution = 0;

    nextOccurrences.forEach((occurrence, index) => {
      while (occurrence && occurrence < nextMonthStart) {
        contribution = roundMoney(contribution + contributions[index].amount);
        nextOccurrences[index] = getNextOccurrence(
          contributions[index],
          addOccurrence(occurrence, contributions[index].frequency),
          horizon,
        );
        occurrence = nextOccurrences[index];
      }
    });

    projectedAmount = roundMoney(projectedAmount + contribution);
    const remainingAmount = Math.max(0, roundMoney(targetAmount - projectedAmount));
    timeline.push({
      month: monthStart.toISOString().slice(0, 7),
      contribution,
      projectedAmount,
      remainingAmount,
      reachedTarget: remainingAmount === 0,
    });

    monthStart = nextMonthStart;
    guard += 1;
  }

  return timeline;
}

export function buildSavingPotForecasts(input: {
  pots: ForecastPot[];
  recurringTransfers: RecurringTransferRule[];
  monthlyBudgetRules: ForecastRule[];
  savingPotAccountAssignments?: SavingPotAccountAssignment[];
  asOf?: Date;
}) {
  const asOf = input.asOf
    ? new Date(Date.UTC(input.asOf.getUTCFullYear(), input.asOf.getUTCMonth(), input.asOf.getUTCDate()))
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const horizon = addMonths(asOf, FORECAST_HORIZON_MONTHS);
  const currentMonthKey = monthKey(asOf);
  const potIdsByAccountId = new Map<string, string[]>();
  for (const assignment of input.savingPotAccountAssignments ?? []) {
    const current = potIdsByAccountId.get(assignment.account_id) ?? [];
    current.push(assignment.pot_id);
    potIdsByAccountId.set(assignment.account_id, current);
  }
  // Resolve each rule's allocations into independent per-destination
  // contributions once, up front, so every pot below sees the same flat
  // list of monthly-budget transfers the execution engine would produce.
  const flattenedMonthlyBudgetRules = flattenRuleAllocations(input.monthlyBudgetRules);

  return new Map<string, SavingPotForecast>(
    input.pots.map((pot): [string, SavingPotForecast] => {
      const targetAmount = pot.targetAmount == null ? null : roundMoney(Number(pot.targetAmount));
      const currentAmount = roundMoney(Number(pot.currentAmount));
      const remainingAmount = targetAmount == null ? 0 : Math.max(0, roundMoney(targetAmount - currentAmount));

      if (!Number.isFinite(targetAmount ?? Number.NaN) || (targetAmount ?? 0) <= 0) {
        return [
          pot.id,
          {
            potId: pot.id,
            currentAmount,
            targetAmount: null,
            remainingAmount: 0,
            monthlyContribution: 0,
            sources: [],
            timeline: [],
            completionDate: null,
            unavailableReason: "missing_target",
          } satisfies SavingPotForecast,
        ];
      }

      if (remainingAmount <= 0) {
        return [
          pot.id,
          {
            potId: pot.id,
            currentAmount,
            targetAmount,
            remainingAmount,
            monthlyContribution: 0,
            sources: [],
            timeline: [],
            completionDate: toDateKey(asOf),
            unavailableReason: null,
          } satisfies SavingPotForecast,
        ];
      }

      const contributions = [
        ...input.recurringTransfers
          .filter(
            (rule) =>
              rule.is_active &&
              rule.rule_kind === "transfer" &&
              ruleContributesToPot(rule, pot.id, potIdsByAccountId),
          )
          .map((rule) => toContribution(rule, "recurring_transfer", asOf)),
        ...flattenedMonthlyBudgetRules
          .filter((rule) => {
            if (!rule.is_active) return false;
            return ruleContributesToPot(rule, pot.id, potIdsByAccountId);
          })
          .map((rule) => toContribution(rule, "monthly_budget", asOf)),
      ].filter((contribution): contribution is ForecastContribution => contribution !== null);

      const sources = (["recurring_transfer", "monthly_budget"] as const)
        .map((kind) => {
          const matching = contributions.filter((contribution) => contribution.kind === kind);
          return {
            kind,
            monthlyContribution: roundMoney(
              matching.reduce(
                (sum, contribution) => sum + monthlyContribution(contribution, asOf, horizon),
                0,
              ),
            ),
            contributionCount: matching.length,
          } satisfies SavingPotForecastSource;
        })
        .filter((source) => source.contributionCount > 0);
      const totalMonthlyContribution = roundMoney(
        sources.reduce((sum, source) => sum + source.monthlyContribution, 0),
      );

      if (contributions.length === 0 || totalMonthlyContribution <= 0) {
        return [
          pot.id,
          {
            potId: pot.id,
            currentAmount,
            targetAmount,
            remainingAmount,
            monthlyContribution: 0,
            sources,
            timeline: [],
            completionDate: null,
            unavailableReason: "no_active_contributions",
          } satisfies SavingPotForecast,
        ];
      }

      const completionDate = findCompletionDate(contributions, remainingAmount, asOf, horizon);
      const resolvedTargetAmount = targetAmount ?? 0;
      let timeline = buildForecastTimeline(
        contributions,
        currentAmount,
        resolvedTargetAmount,
        asOf,
        horizon,
      );

      // The current month's row would otherwise show a $0 contribution
      // purely because a contribution already settled this month (see
      // ForecastRule's skipMonthKeys doc comment) was skipped here — that
      // money already landed in the pot's balance, so there's nothing left
      // to project for this month. Drop the row instead of showing a
      // misleading zero. Months that are legitimately $0 for other reasons
      // (e.g. leading up to a seasonal bonus) are left as-is.
      const hasSkippedCurrentMonthContribution = contributions.some(
        (contribution) => contribution.skipMonthKeys.has(currentMonthKey),
      );
      if (hasSkippedCurrentMonthContribution && timeline[0]?.month === currentMonthKey && timeline[0].contribution === 0) {
        timeline = timeline.slice(1);
      }

      return [
        pot.id,
        {
          potId: pot.id,
          currentAmount,
          targetAmount,
          remainingAmount,
          monthlyContribution: totalMonthlyContribution,
          sources,
          timeline,
          completionDate,
          unavailableReason: completionDate ? null : "beyond_horizon",
        } satisfies SavingPotForecast,
      ];
    }),
  );
}

export const savingPotForecastConstants = {
  FORECAST_HORIZON_MONTHS,
};
