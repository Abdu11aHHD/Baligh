import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, so it is used ONLY inside route handlers
 * for the narrow anonymous operations (resolve location, create ticket, track
 * ticket with a verified secret, rate limiting). Never import from client code.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const env = getSupabaseEnv();
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
