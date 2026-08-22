import { combineTimelines, type BalanceForecast, type BalanceForecastTimelineItem } from './services/balance-forecast.service';

export const FORECAST_PERIOD_OPTIONS = [3, 6, 12, 24] as const;
export type ForecastPeriodMonths = (typeof FORECAST_PERIOD_OPTIONS)[number];

export const DEFAULT_FORECAST_PERIOD_MONTHS: ForecastPeriodMonths = 12;

export function formatForecastMonth(month: string) {
  if (!month) return '';
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export type ForecastYearRow = {
  year: string;
  movement: number;
  balance: number;
};

export function buildForecastYearRows(timeline: BalanceForecastTimelineItem[]): ForecastYearRow[] {
  const rows = new Map<string, ForecastYearRow>();

  for (const item of timeline) {
    const year = item.month.slice(0, 4);
    const current = rows.get(year) ?? { year, movement: 0, balance: 0 };

    current.movement += item.movement;
    current.balance = item.balance;
    rows.set(year, current);
  }

  return [...rows.values()];
}

/** Balance extent (including zero) across a timeline slice, used to scale the bar visualization. */
export function getForecastBalanceExtent(timeline: BalanceForecastTimelineItem[]) {
  const balances = timeline.map((item) => item.balance);
  return {
    min: Math.min(0, ...balances, 0),
    max: Math.max(0, ...balances, 0),
  };
}

/** 0-100 bar-fill height for one timeline balance, scaled against the extent of the visible period. */
export function getForecastBarHeightPercent(balance: number, extent: { min: number; max: number }) {
  const range = extent.max - extent.min;
  if (range <= 0) return balance >= 0 ? 100 : 0;
  return Math.max(3, Math.round(((balance - extent.min) / range) * 100));
}

/** Percentage change for one timeline entry, relative to the balance before that month's movement. Null when there's nothing meaningful to divide by (prior balance of zero). */
export function getForecastMonthPercentChange(item: BalanceForecastTimelineItem): number | null {
  const previousBalance = item.balance - item.movement;
  if (previousBalance === 0) return null;
  return (item.movement / Math.abs(previousBalance)) * 100;
}

/** Index of the timeline entry with the single largest absolute movement — used to flag "biggest change" — or -1 if every movement is zero. */
export function getBiggestForecastChangeIndex(timeline: BalanceForecastTimelineItem[]): number {
  let bestIndex = -1;
  let bestMagnitude = 0;

  timeline.forEach((item, index) => {
    const magnitude = Math.abs(item.movement);
    if (magnitude > bestMagnitude) {
      bestMagnitude = magnitude;
      bestIndex = index;
    }
  });

  return bestIndex;
}

// ============================================================
// Combined-forecast breakdown (Month → Account Type → Account)
// ============================================================
// A saving pot has no owner and isn't a real `account.type`, so it gets its
// own synthetic owner bucket and type bucket here — a household member's
// accounts are tagged with their own id, everything without an owner
// (shared accounts AND every pot) falls under SHARED_BREAKDOWN_OWNER_KEY,
// and every pot is grouped under POT_BREAKDOWN_TYPE_KEY regardless of what
// accounts back it. This mirrors how the account-selection dropdown groups
// the same entities, so the tree the user picks from and the breakdown the
// preview renders always agree.
//
// Ownership is deliberately NOT a separate nesting level in the breakdown
// (no "Month → User → Type → Account" tree). A dedicated user tier repeats
// the same type rows once per member and adds a tap just to get past it —
// for the stated goal ("which user owns each account") a compact ownerLabel
// caption on each account row already answers that, and is skipped
// entirely when every selected account belongs to the same person/nobody
// (the common single-owner household case), so ownership costs nothing
// extra to display and never forces an extra nesting layer.

export const SHARED_BREAKDOWN_OWNER_KEY = '__shared__';
export const POT_BREAKDOWN_TYPE_KEY = '__pot__';

/** Canonical display order for account-type breakdown buckets; anything not listed sorts after these, in first-seen order. */
const BREAKDOWN_TYPE_ORDER = ['bank', 'cash', 'checking', 'savings', 'credit_card', 'credit', 'investment', 'ppr', POT_BREAKDOWN_TYPE_KEY];

export type ForecastBreakdownEntity = {
  id: string;
  name: string;
  /** Household member id, or SHARED_BREAKDOWN_OWNER_KEY for a shared account or a pot. */
  ownerKey: string;
  ownerLabel: string;
  /** Account type, or POT_BREAKDOWN_TYPE_KEY for a pot. */
  typeKey: string;
  typeLabel: string;
  /** Today's actual balance, before any projected movement — carried through to ForecastBreakdownAccountLeaf so the Graph's account detail panel can show "Current" without a second lookup back to the original entity. */
  currentBalance: number;
  timeline: BalanceForecastTimelineItem[];
};

export type ForecastBreakdownAccountLeaf = {
  key: string;
  label: string;
  ownerKey: string;
  ownerLabel: string;
  typeKey: string;
  typeLabel: string;
  currentBalance: number;
  timeline: BalanceForecastTimelineItem[];
};

/** One aggregated bucket — a type, an owner, or any other grouping — with its own combined timeline plus the account leaves that roll up into it. */
export type ForecastBreakdownGroup = {
  key: string;
  label: string;
  timeline: BalanceForecastTimelineItem[];
  accounts: ForecastBreakdownAccountLeaf[];
};

/** @deprecated alias of ForecastBreakdownGroup, kept so existing imports don't need to change. */
export type ForecastBreakdownTypeGroup = ForecastBreakdownGroup;

export function sortByBreakdownTypeOrder<T extends { key: string }>(nodes: T[]): T[] {
  return [...nodes].sort((left, right) => {
    const leftRank = BREAKDOWN_TYPE_ORDER.indexOf(left.key);
    const rightRank = BREAKDOWN_TYPE_ORDER.indexOf(right.key);
    if (leftRank === -1 && rightRank === -1) return 0;
    if (leftRank === -1) return 1;
    if (rightRank === -1) return -1;
    return leftRank - rightRank;
  });
}

/**
 * Groups already-computed per-account/per-pot forecasts by whatever key
 * `pick` returns (account type, owner, ...), aggregating each bucket's
 * timeline bottom-up via combineTimelines so the bucket itself — not just
 * its account leaves — carries its own projected balance and monthly
 * variation. Accounts within a bucket are sorted by owner then name, so
 * accounts belonging to the same person naturally cluster together even
 * when nothing renders a dedicated owner section. Shared by every
 * aggregation level the combined-forecast list and graph views offer
 * (Account type, Owner) — see buildForecastNormalizedData.
 */
function buildForecastGroupBy(
  entities: ForecastBreakdownEntity[],
  pick: (entity: ForecastBreakdownEntity) => { key: string; label: string },
): ForecastBreakdownGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, { label: string; leaves: ForecastBreakdownAccountLeaf[] }>();

  for (const entity of entities) {
    const { key, label } = pick(entity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { label, leaves: [] };
      buckets.set(key, bucket);
      order.push(key);
    }

    bucket.leaves.push({
      key: entity.id,
      label: entity.name,
      ownerKey: entity.ownerKey,
      ownerLabel: entity.ownerLabel,
      typeKey: entity.typeKey,
      typeLabel: entity.typeLabel,
      currentBalance: entity.currentBalance,
      timeline: entity.timeline,
    });
  }

  return order.map((key) => {
    const bucket = buckets.get(key)!;
    const accounts = [...bucket.leaves].sort(
      (left, right) => left.ownerLabel.localeCompare(right.ownerLabel) || left.label.localeCompare(right.label),
    );

    return {
      key,
      label: bucket.label,
      timeline: combineTimelines(accounts.map((leaf) => leaf.timeline)),
      accounts,
    };
  });
}

export function buildForecastTypeBreakdown(entities: ForecastBreakdownEntity[]): ForecastBreakdownGroup[] {
  return sortByBreakdownTypeOrder(buildForecastGroupBy(entities, (entity) => ({ key: entity.typeKey, label: entity.typeLabel })));
}

export function buildForecastOwnerBreakdown(entities: ForecastBreakdownEntity[]): ForecastBreakdownGroup[] {
  return buildForecastGroupBy(entities, (entity) => ({ key: entity.ownerKey, label: entity.ownerLabel }));
}

// ============================================================
// Normalized forecast data — the single computed shape both the List/Table
// and Graph presentations consume (Forecast calculation → normalized data
// → presentation). Neither view recomputes anything from raw entities;
// they only pick which part of this object to render and at what
// aggregation level, so the two are guaranteed to agree on every number.
// ============================================================

export type ForecastNormalizedData = {
  /** Total across every currently-selected account/pot. */
  combined: BalanceForecast;
  /** One entry per selected account/pot (the finest aggregation level). */
  accounts: ForecastBreakdownAccountLeaf[];
  /** Selected accounts/pots grouped by account type. */
  types: ForecastBreakdownGroup[];
  /** Selected accounts/pots grouped by owner (household member, or Shared for shared accounts and pots). */
  owners: ForecastBreakdownGroup[];
  hasMultipleOwners: boolean;
  hasMultipleTypes: boolean;
};

/**
 * Builds every aggregation level the List and Graph views need from one
 * pass over the selected entities. `ownerOrder` (member ids, then
 * SHARED_BREAKDOWN_OWNER_KEY) is optional and only affects display order of
 * the `owners` groups — pass the household's member order so it matches
 * the account-selection picker's own section order.
 */
export function buildForecastNormalizedData(
  entities: ForecastBreakdownEntity[],
  combined: BalanceForecast,
  ownerOrder?: string[],
): ForecastNormalizedData {
  // The first timeline entry is always the current calendar month — mostly
  // or entirely elapsed already, so it's normally flat (today's balance
  // carried forward with whatever's left of this month's activity) and
  // isn't a meaningful "future" data point. Dropped once, here, so every
  // aggregation level (List and Graph both read from this single builder)
  // starts from the next real future month.
  const futureEntities = entities.map((entity) => ({ ...entity, timeline: entity.timeline.slice(1) }));
  const futureCombined: BalanceForecast = { ...combined, timeline: combined.timeline.slice(1) };

  const types = buildForecastTypeBreakdown(futureEntities);
  const ownersRaw = buildForecastOwnerBreakdown(futureEntities);
  const owners = ownerOrder
    ? [...ownersRaw].sort((left, right) => {
        const leftRank = ownerOrder.indexOf(left.key);
        const rightRank = ownerOrder.indexOf(right.key);
        return (leftRank === -1 ? Infinity : leftRank) - (rightRank === -1 ? Infinity : rightRank);
      })
    : ownersRaw;

  return {
    combined: futureCombined,
    accounts: types.flatMap((group) => group.accounts),
    types,
    owners,
    hasMultipleOwners: new Set(entities.map((entity) => entity.ownerKey)).size > 1,
    hasMultipleTypes: new Set(entities.map((entity) => entity.typeKey)).size > 1,
  };
}

/** Accent color for an account-type bucket — shared by the List breakdown's dots and the Graph's per-type lines, so the same type always reads as the same color in both views. */
export function getForecastTypeColor(colors: any, typeKey: string): string {
  switch (typeKey) {
    case 'savings':
    case 'ppr':
      return colors.financialGoal;
    case 'investment':
      return colors.primary;
    case 'credit_card':
    case 'credit':
      return colors.financialAttention;
    case POT_BREAKDOWN_TYPE_KEY:
      return colors.financialAttention;
    default:
      return colors.financialNeutral;
  }
}

/** Rotating accent palette for series that don't have an inherent semantic color (individual accounts, owners) — the same rotation used for the Insights category chart and the household per-person breakdown, so the graph reads as part of the same design language. */
export function getForecastSeriesColor(colors: any, index: number): string {
  const palette = [
    colors.primary,
    colors.financialPositive,
    colors.financialNeutral,
    colors.financialGoal,
    colors.financialAttention,
    colors.info,
    colors.warning,
    colors.destructive,
  ];
  return palette[index % palette.length];
}
