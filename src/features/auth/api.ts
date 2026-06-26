import { supabase } from "../../lib/supabase";

export async function getSession() {
  const { data } = await supabase.auth.getSession();

  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}