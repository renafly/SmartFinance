import { supabase } from '@/shared/lib/supabase/client'

export class SessionRepository {
  async getProfile(userId: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  }

  async getMembership(userId: string) {
    return supabase
      .from('household_members')
      .select('*')
      .eq('user_id', userId)
      .single()
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