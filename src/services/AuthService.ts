import { supabase } from '../shared/lib/supabase/client';

export const AuthService = {
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
