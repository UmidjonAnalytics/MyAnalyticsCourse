import "server-only";
import { BRAND_PLACEHOLDER } from "@/lib/i18n/uz";
import type { createClient } from "@/lib/supabase/server";

// Launch checklist: what is configured, what still blocks selling. Reads env + database only.

export type CheckStatus = "ok" | "todo" | "warn" | "manual";
export type Check = { id: string; group: string; status: CheckStatus };

type Supabase = Awaited<ReturnType<typeof createClient>>;
const set = (v: string | undefined) => Boolean(v && v.trim());
const on = (v: string | undefined) => v === "true" || v === "1";

export async function launchChecks(supabase: Supabase): Promise<Check[]> {
  const env = process.env;
  const [{ data: settings }, { data: courses }] = await Promise.all([
    supabase.from("site_settings").select("company_name, stir, phone, email").eq("id", 1).maybeSingle(),
    supabase
      .from("courses")
      .select("id, instructor_id, outcomes, lessons(count)")
      .eq("is_published", true)
      .is("archived_at", null),
  ]);

  const brand = set(env.NEXT_PUBLIC_BRAND_NAME) && env.NEXT_PUBLIC_BRAND_NAME!.trim() !== BRAND_PLACEHOLDER;
  const site = env.PUBLIC_SITE_URL ?? "";
  const ownDomain = set(site) && !/\.(vercel|netlify)\.app|localhost|127\.0\.0\.1/.test(site);
  const company = Boolean(settings?.company_name && settings.stir && settings.phone && settings.email);
  const smsReady = env.SMS_PROVIDER === "eskiz" && set(env.ESKIZ_EMAIL) && set(env.ESKIZ_PASSWORD) && set(env.SEND_SMS_HOOK_SECRET);
  const payme = set(env.PAYME_MERCHANT_ID) && set(env.PAYME_KEY);
  const click = set(env.CLICK_SERVICE_ID) && set(env.CLICK_MERCHANT_ID) && set(env.CLICK_SECRET_KEY);
  const published = courses ?? [];
  const withLessons = published.filter((c) => (c.lessons[0]?.count ?? 0) > 0);
  const complete = withLessons.length > 0 && withLessons.every((c) => c.instructor_id && c.outcomes.length > 0);

  return [
    { id: "brandName", group: "brand", status: brand ? "ok" : "todo" },
    { id: "domain", group: "brand", status: ownDomain ? "ok" : "todo" },
    { id: "company", group: "legal", status: company ? "ok" : "todo" },
    { id: "lawyer", group: "legal", status: "manual" },
    { id: "devLogin", group: "auth", status: set(env.DEV_LOGIN_CODE) ? "warn" : "ok" },
    { id: "sms", group: "auth", status: smsReady ? "ok" : "todo" },
    { id: "smsHook", group: "auth", status: "manual" },
    { id: "testPayments", group: "payments", status: on(env.ENABLE_TEST_PAYMENTS) ? "warn" : "ok" },
    { id: "payme", group: "payments", status: payme ? (on(env.PAYME_TEST) ? "warn" : "ok") : "todo" },
    { id: "click", group: "payments", status: click ? "ok" : "todo" },
    { id: "paynet", group: "payments", status: "todo" },
    { id: "courses", group: "content", status: withLessons.length > 0 ? "ok" : "todo" },
    { id: "coursePages", group: "content", status: complete ? "ok" : "todo" },
    { id: "vercelPro", group: "hosting", status: "manual" },
  ];
}
