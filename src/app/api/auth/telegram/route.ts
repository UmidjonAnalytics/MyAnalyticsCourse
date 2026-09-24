import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { telegramAuthSchema, telegramFullName, verifyTelegramAuth } from "@/lib/auth/telegram";
import { LoginError, signInWithTelegramIdentity } from "@/lib/auth/login";
import { uz } from "@/lib/i18n/uz";

// POST /api/auth/telegram  body: the object from the Telegram Login Widget
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = telegramAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: uz.errors.invalidRequest }, { status: 400 });
  }

  const check = verifyTelegramAuth(parsed.data, serverEnv().TELEGRAM_BOT_TOKEN);
  if (!check.ok) {
    const message = check.reason === "expired" ? uz.errors.telegramExpired : uz.errors.telegramInvalid;
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    await signInWithTelegramIdentity({
      telegramId: parsed.data.id,
      fullName: telegramFullName(parsed.data),
      username: parsed.data.username ?? null,
      photoUrl: parsed.data.photo_url ?? null,
    });
  } catch (error) {
    console.error("[telegram login]", error instanceof LoginError ? error.message : error);
    return NextResponse.json({ error: uz.landing.loginFailed }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: "/learn" });
}
