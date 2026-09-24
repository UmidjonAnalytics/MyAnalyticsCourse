import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { normalizeUzPhone, maskUzPhone } from "@/lib/phone";
import { rateLimit, rateLimitAll } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createClient } from "@/lib/supabase/server";

// Sends a 6-digit SMS code.
//  purpose "login": log in or sign up with this phone.
//  purpose "link":  add/verify this phone on the logged-in account (Google/Apple users).
const body = z.object({
  phone: z.string().max(32),
  purpose: z.enum(["login", "link"]).default("login"),
});

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "validation_failed");
  const phone = normalizeUzPhone(parsed.data.phone);
  if (!phone) return apiError(400, "invalid_phone");

  const ip = clientIp(request.headers);
  if (!(await rateLimit(`otp-send-gap:${phone}`, 1, 55))) return apiError(429, "over_sms_send_rate_limit");
  const allowed = await rateLimitAll([
    [`otp-send:phone:${phone}`, 5, 60 * 60],
    [`otp-send:ip:${ip}`, 20, 60 * 60],
  ]);
  if (!allowed) return apiError(429, "rate_limited");

  const supabase = await createClient();
  // A 5xx from Supabase here almost always means our SMS hook / provider failed.
  const fail = (err: { status?: number; code?: string }) =>
    (err.status ?? 400) >= 500 ? apiError(502, "sms_send_failed") : apiError(err.status ?? 400, err.code ?? "generic");

  if (parsed.data.purpose === "login") {
    const { error } = await supabase.auth.signInWithOtp({ phone: `+${phone}` });
    if (error) return fail(error);
  } else {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return apiError(401, "not_logged_in");
    const { error } = await supabase.auth.updateUser({ phone: `+${phone}` });
    if (error) return fail(error);
  }

  return apiOk({ maskedPhone: maskUzPhone(phone) });
}
