import type { SavingPotForecastTimelineItem } from './services/saving-pot-forecast.service';

export type SavingPotAccountOption = {
  id: string;
  name: string;
  type: string;
  owner_profile_id: string | null;
  current_balance: number;
};

export type ForecastYearRow = {
  year: string;
  contribution: number;
  projectedAmount: number;
  remainingAmount: number;
};

export function buildForecastYearRows(timeline: SavingPotForecastTimelineItem[]) {
  const rows = new Map<string, ForecastYearRow>();

  for (const item of timeline) {
    const year = item.month.slice(0, 4);
    const current = rows.get(year) ?? {
      year,
      contribution: 0,
      projectedAmount: 0,
      remainingAmount: 0,
    };

    current.contribution += item.contribution;
    current.projectedAmount = item.projectedAmount;
    current.remainingAmount = item.remainingAmount;
    rows.set(year, current);
  }

  return [...rows.values()];
}

export function formatForecastMonth(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export function getAccountSummary(account: SavingPotAccountOption, memberLabelMap: Map<string, string>, sharedLabel: string) {
  const ownerLabel = account.owner_profile_id
    ? memberLabelMap.get(account.owner_profile_id) ?? sharedLabel
    : sharedLabel;

  return `${account.type} · ${ownerLabel}`;
}
