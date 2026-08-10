import type { Ionicons } from '@expo/vector-icons';

import type { DashboardAccount, MemberDetails } from './types';
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
