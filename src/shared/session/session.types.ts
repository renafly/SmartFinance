import type { Database } from '@/shared/types/database.types'

export type UserProfile = Database['public']['Tables']['profiles']['Row']

export type Household = Database['public']['Tables']['households']['Row']

export type HouseholdMember = Database['public']['Tables']['household_members']['Row']

export interface SessionState {
  userId: string | null
  profile: UserProfile | null
  household: Household | null
  householdMember: HouseholdMember | null
  loading: boolean
}