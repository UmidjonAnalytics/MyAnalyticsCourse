import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { DEV_EMAIL_DOMAIN } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";

// TEST MODE (while building the platform): when DEV_LOGIN_CODE is set (e.g. 123456), any phone
// number logs in with that code. No SMS is sent; no SMS hook / Eskiz / Supabase Phone provider
// is needed. REMOVE DEV_LOGIN_CODE BEFORE REAL STUDENTS USE THE SITE.

export function devLoginCode(): string | null {
  const code = process.env.DEV_LOGIN_CODE?.trim();
  return code && /^\d{6}$/.test(code) ? code : null;
}

type Result = { ok: true } | { ok: false; code: string };

/** Logs the browser in as the user with this phone (creating the user if needed). */
export async function devSignIn(supabase: SupabaseClient<Database>, phone: string): Promise<Result> {
  const admin = createAdminClient();
  const password = randomBytes(24).toString("base64url");
  const devEmail = `${phone}@${DEV_EMAIL_DOMAIN}`;
  let loginEmail = devEmail;

  const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();

  if (existing) {
    const { data: found, error: getErr } = await admin.auth.admin.getUserById(existing.id);
    if (getErr || !found.user) return { ok: false, code: "generic" };
    // Real (e.g. Google) email if the account has one, otherwise the placeholder test email.
    loginEmail = found.user.email || devEmail;
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      ...(found.user.email ? {} : { email: devEmail, email_confirm: true }),
    });
    if (error) return { ok: false, code: error.code ?? "generic" };
  } else {
    const { error } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: devEmail,
      email_confirm: true,
      password,
    });
    if (error) return { ok: false, code: error.code ?? "generic" };
  }

  // Sets the normal Supabase session cookies, exactly like a real login.
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
  if (error) {
    console.error("dev login failed", error.message);
    return { ok: false, code: error.code ?? "generic" };
  }
  return { ok: true };
}

/** Adds a verified phone to the logged-in account (the profile's "Telefonni tasdiqlash"). */
export async function devLinkPhone(userId: string, phone: string): Promise<Result> {
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { phone, phone_confirm: true });
  if (error) return { ok: false, code: error.code ?? "generic" };
  return { ok: true };
}
