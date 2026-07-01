import { supabase } from '@/shared/lib/supabase/client'

export class SessionRepository {
  async getProfile(userId: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  }

  async getAcceptedMemberships(userId: string) {
    return supabase
      .from('household_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('joined_at', { ascending: false })
  }

  async setDefaultHousehold(householdId: string) {
    return supabase.rpc('set_default_household', {
      p_household_id: householdId,
    })
  }

  async getHousehold(householdId: string) {
    return supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single()
  }
}

export const sessionRepository = new SessionRepository()