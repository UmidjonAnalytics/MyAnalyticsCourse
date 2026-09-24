import "server-only";
import { cookies, headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from "@/lib/auth/constants";

const DEVICE_ID = /^[A-Za-z0-9-]{16,100}$/;

export async function currentDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return value && DEVICE_ID.test(value) ? value : null;
}

/**
 * Call right after a successful login (OTP verify, OAuth callback). Records this device and
 * pushes out the oldest device if the student is now on more than 2. Route Handlers only.
 */
export async function registerCurrentDevice(
  supabase: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const cookieStore = await cookies();
  const deviceId = (await currentDeviceId()) ?? crypto.randomUUID();
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });

  const userAgent = (await headers()).get("user-agent") ?? "";
  const { error } = await supabase.rpc("register_device_session", {
    p_device_id: deviceId,
    p_user_agent: userAgent,
  });
  if (error) {
    console.error("register_device_session failed", error.message);
    const code = error.message.includes("session_revoked") ? "session_revoked" : "generic";
    return { ok: false, code };
  }
  return { ok: true };
}
