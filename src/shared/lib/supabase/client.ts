import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const memoryStorage = {
  async getItem(_key: string) {
    return null;
  },
  async setItem(_key: string, _value: string) {
    return undefined;
  },
  async removeItem(_key: string) {
    return undefined;
  },
};

// Reads from process.env - see .env / .env.example (item 45). These are
// EXPO_PUBLIC_ prefixed so Expo inlines them into the client bundle;
// never put the service-role key here.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env
  .EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[SmartFinance] Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== "undefined" ? AsyncStorage : memoryStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
