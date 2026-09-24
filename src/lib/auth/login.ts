import "server-only";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE, MAX_DEVICES, deviceCookieOptions } from "@/lib/auth/constants";

// Supabase Auth needs an email, but students log in with Telegram. Each Telegram account gets
// an internal address that is never shown and never receives mail.
const INTERNAL_EMAIL_DOMAIN = "telegram.local";

export type TelegramIdentity = {
  telegramId: number;
  fullName: string;
  username: string | null;
  photoUrl: string | null;
};

export class LoginError extends Error {}

function internalEmail(telegramId: number) {
  return `tg${telegramId}@${INTERNAL_EMAIL_DOMAIN}`;
}

// The Supabase session id is inside the access token (JWT claim "session_id").
function sessionIdFromAccessToken(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (json && typeof json === "object" && "session_id" in json && typeof json.session_id === "string") {
      return json.session_id;
    }
  } catch {
    // ignore malformed token
  }
  return null;
}

/**
 * Find or create the user for a verified Telegram identity, start a Supabase session
 * (sets auth cookies) and register this device (max 2 active devices).
 */
export async function signInWithTelegramIdentity(identity: TelegramIdentity) {
  const admin = createAdminClient();
  const email = internalEmail(identity.telegramId);

  // 1. Make sure the auth user exists.
  const { data: existing, error: findError } = await admin
    .from("profiles")
    .select("id")
    .eq("telegram_id", identity.telegramId)
    .maybeSingle();
  if (findError) throw new LoginError(`profile lookup failed: ${findError.message}`);

  if (!existing) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { telegram_id: identity.telegramId, full_name: identity.fullName },
    });
    // "email_exists" means the auth user exists but the profile row is missing: continue.
    if (createError && createError.code !== "email_exists") {
      throw new LoginError(`create user failed: ${createError.message}`);
    }
  }

  // 2. One-time login token for that user (no email is sent).
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token || !link.user) {
    throw new LoginError(`generate link failed: ${linkError?.message ?? "no token"}`);
  }
  const userId = link.user.id;

  // 3. Create or refresh the profile. full_name/phone are editable by the student, so an
  //    existing name is not overwritten.
  if (existing) {
    const { error } = await admin
      .from("profiles")
      .update({ username: identity.username, photo_url: identity.photoUrl })
      .eq("id", userId);
    if (error) throw new LoginError(`profile update failed: ${error.message}`);
  } else {
    const { error } = await admin.from("profiles").upsert(
      {
        id: userId,
        telegram_id: identity.telegramId,
        full_name: identity.fullName,
        username: identity.username,
        photo_url: identity.photoUrl,
      },
      { onConflict: "id" },
    );
    if (error) throw new LoginError(`profile insert failed: ${error.message}`);
  }

  // 4. Exchange the token for a real session. This writes the auth cookies.
  const supabase = await createClient();
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError || !verified.session) {
    throw new LoginError(`verify failed: ${verifyError?.message ?? "no session"}`);
  }

  // 5. Register this device and log out the oldest one if there are more than MAX_DEVICES.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const deviceId = cookieStore.get(DEVICE_COOKIE)?.value ?? randomUUID();
  cookieStore.set(DEVICE_COOKIE, deviceId, deviceCookieOptions());

  const { error: deviceError } = await admin.rpc("register_device_session", {
    p_user_id: userId,
    p_device_id: deviceId,
    p_auth_session_id: sessionIdFromAccessToken(verified.session.access_token),
    p_user_agent: headerStore.get("user-agent") ?? "",
    p_limit: MAX_DEVICES,
  });
  if (deviceError) throw new LoginError(`device registration failed: ${deviceError.message}`);

  return { userId };
}

/** Log out the current device: revoke its device session and clear the auth cookies. */
export async function signOutCurrentDevice() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const deviceId = cookieStore.get(DEVICE_COOKIE)?.value;
  const { data } = await supabase.auth.getUser();

  await supabase.auth.signOut({ scope: "local" });

  if (data.user && deviceId) {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("device_sessions")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("device_id", deviceId)
      .is("revoked_at", null)
      .maybeSingle();
    if (row) await admin.rpc("revoke_device_session", { p_id: row.id, p_reason: "logout" });
  }
}
