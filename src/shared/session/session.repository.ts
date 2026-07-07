import { supabase } from '@/shared/lib/supabase/client';

export class SessionRepository {
  async getProfile(userId: string) {
    return supabase.from('profiles').select('*').eq('id', userId).single();
  }

  async getAcceptedMemberships(userId: string) {
    return supabase
      .from('household_members')
      .select('household_id, household:households(id, deleted_at)')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('joined_at', { ascending: false });
  }
}

export const sessionRepository = new SessionRepository();
