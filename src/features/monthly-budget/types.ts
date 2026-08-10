import type { Database } from '@/types/database.types';
import type { HouseholdMemberDetails } from '../households/hooks';

export type BudgetAccountLike = {
  id: string;
  household_id: string;
  owner_profile_id: string | null;
  name: string;
  type: Database['public']['Enums']['account_type'];
  currency: Database['public']['Enums']['currency_code'];
  initial_balance: number;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  current_balance?: number | null;
};

export type BudgetMemberLike = HouseholdMemberDetails;
