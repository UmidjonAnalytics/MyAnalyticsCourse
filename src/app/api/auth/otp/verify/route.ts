import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { registerCurrentDevice } from "@/lib/auth/device";
import { normalizeUzPhone } from "@/lib/phone";
import { rateLimitAll } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Checks the SMS code. Max 5 wrong tries per phone per 15 minutes.
const body = z.object({
  phone: z.string().max(32),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(["login", "link"]).default("login"),
  next: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "validation_failed");
  const phone = normalizeUzPhone(parsed.data.phone);
  if (!phone) return apiError(400, "invalid_phone");

  const ip = clientIp(request.headers);
  const allowed = await rateLimitAll([
    [`otp-verify:phone:${phone}`, 5, 15 * 60],
    [`otp-verify:ip:${ip}`, 30, 15 * 60],
  ]);
  if (!allowed) return apiError(429, "too_many_attempts");

  const supabase = await createClient();

  if (parsed.data.purpose === "link") {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return apiError(401, "not_logged_in");
  }

  const { error } = await supabase.auth.verifyOtp({
    phone: `+${phone}`,
    token: parsed.data.code,
    type: parsed.data.purpose === "link" ? "phone_change" : "sms",
  });
  if (error) return apiError(error.status ?? 400, error.code ?? "otp_expired");

  // Record this device (and push out the oldest one above the limit).
  const device = await registerCurrentDevice(supabase);
  if (!device.ok) {
    await supabase.auth.signOut({ scope: "local" });
    return apiError(401, device.code);
  }

  return apiOk({ next: safeNext(parsed.data.next, parsed.data.purpose === "link" ? "/profil" : "/") });
}
