import "server-only";
import { createHmac } from "node:crypto";
import { getSigningSecret } from "./env";
import { getSupabaseAdmin } from "./supabase/admin";

/**
 * Per-IP fixed windows. Campus Wi-Fi often puts many trainees behind ONE public
 * IP (NAT), so these are deliberately generous; tighten them if abuse appears.
 */
export const RATE_LIMITS = {
  analyze: { limit: 30, windowSeconds: 600 },
  create: { limit: 15, windowSeconds: 600 },
  track: { limit: 60, windowSeconds: 600 },
  resolve: { limit: 60, windowSeconds: 60 },
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

export class RateLimitUnavailableError extends Error {}

/**
 * Durable, serverless-safe fixed-window limiter backed by a Postgres function
 * (atomic upsert). IPs are HMAC-hashed so raw addresses are never stored.
 * Fails closed: if the limiter cannot be consulted, the request is refused.
 */
export async function checkRateLimit(bucket: RateBucket, ip: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const ipHash = createHmac("sha256", getSigningSecret()).update(ip).digest("base64url").slice(0, 32);
  const { data, error } = await getSupabaseAdmin().rpc("check_rate_limit", {
    p_key: `${bucket}:${ipHash}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new RateLimitUnavailableError(error.message);
  return data === true;
}
