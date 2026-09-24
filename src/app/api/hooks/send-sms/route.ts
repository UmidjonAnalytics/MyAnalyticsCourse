import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { uz } from "@/lib/i18n/uz";
import { getSmsProvider, SmsError } from "@/lib/sms";
import { verifyStandardWebhook } from "@/lib/webhook-signature";

// Supabase "Send SMS" Auth Hook. Supabase calls this with the phone and the code; we send the
// SMS through our provider (Eskiz). Docs: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
// Where to send: sms.phone (newer Supabase), else user.new_phone (adding a phone to a
// Google/Apple account), else user.phone (login).
const payload = z.object({
  user: z.object({ phone: z.string().optional(), new_phone: z.string().optional() }).loose(),
  sms: z.object({ otp: z.string().regex(/^\d{4,10}$/), phone: z.string().optional() }).loose(),
});

function hookError(status: number, message: string) {
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

export async function POST(request: NextRequest) {
  const env = serverEnv();
  if (!env.SEND_SMS_HOOK_SECRET) return hookError(500, "SEND_SMS_HOOK_SECRET is not set");

  const raw = await request.text();
  if (!verifyStandardWebhook(raw, request.headers, env.SEND_SMS_HOOK_SECRET)) {
    return hookError(401, "Invalid signature");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return hookError(400, "Invalid JSON");
  }
  const parsed = payload.safeParse(json);
  if (!parsed.success) return hookError(400, "Invalid payload");

  const { user, sms } = parsed.data;
  const phone = (sms.phone || user.new_phone || user.phone || "").replace(/\D/g, "");
  if (phone.length < 9) return hookError(400, "No phone number in payload");
  try {
    await getSmsProvider().send(phone, uz.sms.otp(sms.otp));
  } catch (err) {
    console.error("send-sms hook failed", err instanceof Error ? err.message : err);
    const retryable = err instanceof SmsError && err.retryable;
    return hookError(retryable ? 503 : 500, "SMS could not be sent");
  }

  return NextResponse.json({});
}
