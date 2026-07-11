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

export type SavingPotForecast = {
  potId: string;
  currentAmount: number;
  targetAmount: number | null;
  remainingAmount: number;
  monthlyContribution: number;
  sources: SavingPotForecastSource[];
  completionDate: string | null;
  unavailableReason: SavingPotForecastUnavailableReason | null;
};

type ForecastPot = {
  id: string;
  targetAmount: number | null | undefined;
  currentAmount: number | null | undefined;
};

type ForecastRule = {
  id: string;
  account_id?: string | null;
  source_account_id?: string | null;
  destination_pot_id?: string | null;
  destination_account_id?: string | null;
  section?: string | null;
  amount: number | null | undefined;
  frequency: ForecastFrequency;
  is_active: boolean;
  next_run?: string | null;
  created_at?: string | null;
  excluded_months?: Array<number | string> | null;
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
};

type SavingPotAccountAssignment = {
  pot_id: string;
  account_id: string;
};

const FORECAST_HORIZON_MONTHS = 30 * 12;

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

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
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

function isIncludedOccurrence(contribution: ForecastContribution, date: Date) {
  return !(
    contribution.frequency === "custom" &&
    contribution.excludedMonths.includes(date.getUTCMonth() + 1)
  );
}

function getNextOccurrence(
  contribution: ForecastContribution,
  after: Date,
  horizon: Date,
) {
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

  return {
    kind,
    amount,
    frequency: rule.frequency,
    firstRun,
    excludedMonths: normalizeExcludedMonths(rule.excluded_months),
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
  const potIdsByAccountId = new Map<string, string[]>();
  for (const assignment of input.savingPotAccountAssignments ?? []) {
    const current = potIdsByAccountId.get(assignment.account_id) ?? [];
    current.push(assignment.pot_id);
    potIdsByAccountId.set(assignment.account_id, current);
  }

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
        ...input.monthlyBudgetRules
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
            completionDate: null,
            unavailableReason: "no_active_contributions",
          } satisfies SavingPotForecast,
        ];
      }

      const completionDate = findCompletionDate(contributions, remainingAmount, asOf, horizon);

      return [
        pot.id,
        {
          potId: pot.id,
          currentAmount,
          targetAmount,
          remainingAmount,
          monthlyContribution: totalMonthlyContribution,
          sources,
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
