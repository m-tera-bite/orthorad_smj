import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

/**
 * Isolated client for the password-recovery flow. The recovery session lives
 * in memory only: it never touches localStorage or the main client, so it can
 * never leave the user "logged in" if they abandon the reset page.
 */
export function createRecoveryClient() {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "sb-recovery",
    },
  });
}
