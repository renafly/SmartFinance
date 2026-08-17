import type { Ionicons } from '@expo/vector-icons';

export type DashboardAccount = {
  id: string;
  name: string;
  type: string;
  currency?: string;
  owner_profile_id: string | null;
  initial_balance?: number | null;
  current_balance?: number | null;
  balance?: number | null;
};

export type DashboardPot = {
  id: string;
  name: string;
  balance?: number | null;
  target_amount?: number | null;
  created_by?: string | null;
  /** Only present on rows from the `saving_pot_balances` view (see
   * `savingPotsService.getBalances`) -- not on plain `saving_pots` rows. */
  color?: string | null;
  icon?: string | null;
  selected_account_count?: number | null;
};

export type MemberDetails = {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted';
  fullName: string | null;
  email: string | null;
};

export type AllocationKey = 'invested' | 'savings' | 'pots';

export type AllocationSegment = {
  key: AllocationKey;
  label: string;
  value: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};
