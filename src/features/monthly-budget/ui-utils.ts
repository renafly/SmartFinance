import type { BudgetMemberLike } from './types';

export const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export function getMemberLabel(member?: BudgetMemberLike | null, fallback = 'Shared') {
  if (!member) return fallback;
  return member.fullName?.trim() || member.email || fallback;
}

export type OwnedAccountLike = { owner_profile_id: string | null };
export type OwnerImpactGroup<T> = { key: string; ownerProfileId: string | null; label: string; isShared: boolean; impacts: T[] };

/**
 * Presentation-only grouping for "Balance after": buckets already-computed
 * per-account impacts by the owner of each account (accounts.owner_profile_id),
 * people alphabetical, shared/household accounts last. Never touches amounts;
 * keeps each group's impacts in the order they were given. Pure.
 */
export function groupImpactsByOwner<T extends { accountId: string }>(
  impacts: T[],
  accountsById: Map<string, OwnedAccountLike>,
  ownerLabel: (ownerProfileId: string | null) => string,
): OwnerImpactGroup<T>[] {
  const groups = new Map<string, OwnerImpactGroup<T>>();
  for (const impact of impacts) {
    const ownerProfileId = accountsById.get(impact.accountId)?.owner_profile_id ?? null;
    const key = ownerProfileId ?? '__shared__';
    let group = groups.get(key);
    if (!group) {
      group = { key, ownerProfileId, label: ownerLabel(ownerProfileId), isShared: ownerProfileId === null, impacts: [] };
      groups.set(key, group);
    }
    group.impacts.push(impact);
  }
  return [...groups.values()].sort((a, b) => (a.isShared !== b.isShared ? (a.isShared ? 1 : -1) : a.label.localeCompare(b.label)));
}
