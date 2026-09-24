import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Database-backed rate limiter: works the same on Netlify (many short-lived servers) and on a VPS.
// Returns true when the action is allowed.
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open so a database hiccup does not lock everyone out; Supabase has its own OTP limits too.
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}

/** Checks several limits; all must pass. */
export async function rateLimitAll(rules: Array<[key: string, limit: number, windowSeconds: number]>): Promise<boolean> {
  const results = await Promise.all(rules.map(([k, l, w]) => rateLimit(k, l, w)));
  return results.every(Boolean);
}
