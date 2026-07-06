import type { Database } from '@/types/database.types';

export type Claims = Record<string, any> | undefined | null;

export type UserProfile = Database['public']['Tables']['profiles']['Row'] | null;

export type HouseholdMember = Database['public']['Tables']['household_members']['Row'];

export type SessionState = {
  profile: UserProfile;
  householdId: string | null;
  loading: boolean;
};
