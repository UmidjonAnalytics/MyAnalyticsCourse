import { NextResponse } from "next/server";
import { z } from "zod";
import { devLoginEnabled } from "@/lib/env";
import { LoginError, signInWithTelegramIdentity } from "@/lib/auth/login";
import { uz } from "@/lib/i18n/uz";

// Local testing only (Telegram's widget does not work on localhost).
// Enabled when ALLOW_DEV_LOGIN=true AND not a production build.
const bodySchema = z.object({ telegramId: z.number().int().min(1).max(999).default(1) });

export async function POST(request: Request) {
  if (!devLoginEnabled()) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: uz.errors.invalidRequest }, { status: 400 });

  try {
    await signInWithTelegramIdentity({
      telegramId: parsed.data.telegramId,
      fullName: `Test Talaba ${parsed.data.telegramId}`,
      username: `test_talaba_${parsed.data.telegramId}`,
      photoUrl: null,
    });
  } catch (error) {
    console.error("[dev login]", error instanceof LoginError ? error.message : error);
    return NextResponse.json({ error: uz.landing.loginFailed }, { status: 500 });
  }
  return NextResponse.json({ ok: true, redirect: "/learn" });
}
