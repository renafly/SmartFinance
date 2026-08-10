import type { MemberDetails } from './types';

export function getPersonLabel(member: MemberDetails | undefined, fallback: string) {
  return member?.fullName?.trim() || member?.email?.trim() || fallback;
}

export function sumBalances<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPercent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}
