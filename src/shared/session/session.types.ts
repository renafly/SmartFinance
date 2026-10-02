import type { Database } from '@/types/database.types';

export type Claims = Record<string, any> | undefined | null;

export type UserProfile = Database['public']['Tables']['profiles']['Row'] | null;

export type HouseholdMember = Database['public']['Tables']['household_members']['Row'];

export type SessionState = {
  profile: UserProfile;
  householdId: string | null;
  loading: boolean;
  /** True when the last profile/household load failed (e.g. network error).
   * householdId is null in that case but does NOT mean "no household". */
  error: boolean;
};
