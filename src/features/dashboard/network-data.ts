import type { Ionicons } from '@expo/vector-icons';

import type { DashboardAccount, DashboardPot, MemberDetails } from './types';
import { getPersonLabel } from './utils';

export type AccountNetworkNode = {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ACCOUNT_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  bank: 'business-outline',
  cash: 'cash-outline',
  savings: 'file-tray-full-outline',
  investment: 'trending-up-outline',
  ppr: 'shield-checkmark-outline',
  credit_card: 'card-outline',
};

// Same accent rotation used for the Insights category chart and the
// household per-person breakdown, so the "network" visualization reads as
// part of the same design language rather than inventing a new palette.
export function buildAccountAccentPalette(colors: {
  primary: string;
  financialPositive: string;
  financialNeutral: string;
  financialGoal: string;
  financialAttention: string;
  info: string;
  warning: string;
  destructive: string;
}) {
  return [
    colors.primary,
    colors.financialPositive,
    colors.financialNeutral,
    colors.financialGoal,
    colors.financialAttention,
    colors.info,
    colors.warning,
    colors.destructive,
  ];
}

export function buildAccountNetworkNodes(
  accounts: DashboardAccount[],
  memberMap: Map<string, MemberDetails>,
  accentPalette: string[],
  sharedLabel: string,
  unnamedLabel: string,
): AccountNetworkNode[] {
  return accounts
    .filter((account) => Number(account.current_balance ?? account.balance ?? 0) !== 0)
    .sort((a, b) => Number(b.current_balance ?? b.balance ?? 0) - Number(a.current_balance ?? a.balance ?? 0))
    .map((account, index) => ({
      id: account.id,
      label: account.name,
      sublabel: account.owner_profile_id
        ? getPersonLabel(memberMap.get(account.owner_profile_id), unnamedLabel)
        : sharedLabel,
      value: Number(account.current_balance ?? account.balance ?? 0),
      color: accentPalette[index % accentPalette.length],
      icon: ACCOUNT_TYPE_ICON[account.type] ?? 'wallet-outline',
    }));
}

/** Saving pots are a distinct entity from accounts (see `DashboardPot`), so
 * they get their own node builder -- always a flag icon, and a plain
 * `potLabel` sublabel (e.g. "Pots") since a pot isn't owned by a single
 * household member the way an account is. */
export function buildPotNetworkNodes(
  pots: DashboardPot[],
  accentPalette: string[],
  potLabel: string,
): AccountNetworkNode[] {
  return pots
    .filter((pot) => Number(pot.balance ?? 0) !== 0)
    .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
    .map((pot, index) => ({
      id: pot.id,
      label: pot.name,
      sublabel: potLabel,
      value: Number(pot.balance ?? 0),
      color: accentPalette[index % accentPalette.length],
      icon: 'flag-outline',
    }));
}

/** Merges account and pot nodes into a single list for the 3D network,
 * re-sorted by magnitude and re-colored across the combined set (rather
 * than keeping each type's own independent color rotation) so the palette
 * reads as one continuous sequence regardless of how many of each type are
 * shown. */
export function combineDashboardNetworkNodes(
  accountNodes: AccountNetworkNode[],
  potNodes: AccountNetworkNode[],
  accentPalette: string[],
): AccountNetworkNode[] {
  return [...accountNodes, ...potNodes]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .map((node, index) => ({ ...node, color: accentPalette[index % accentPalette.length] }));
}
