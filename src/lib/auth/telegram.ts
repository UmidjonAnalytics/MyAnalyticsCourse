import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Data sent by the Telegram Login Widget.
// https://core.telegram.org/widgets/login#checking-authorization
// looseObject keeps any extra fields Telegram may add: they are part of the signed data.
export const telegramAuthSchema = z.looseObject({
  id: z.number().int().positive(),
  first_name: z.string().max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.url().max(1024).optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type TelegramAuthData = z.infer<typeof telegramAuthSchema>;

// Login data older than this is rejected (protects against replaying an old payload).
const MAX_AGE_SECONDS = 60 * 60 * 24;

export type TelegramVerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): TelegramVerifyResult {
  const { hash, ...fields } = data;
  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${String(fields[k])}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, reason: "invalid" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > MAX_AGE_SECONDS || data.auth_date - now > 60) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function telegramFullName(data: Pick<TelegramAuthData, "first_name" | "last_name">) {
  return [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
}
