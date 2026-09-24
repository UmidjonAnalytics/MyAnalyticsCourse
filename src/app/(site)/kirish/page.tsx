import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Notice } from "@/components/Notice";
import { OAuthButtons } from "@/components/OAuthButtons";
import { PhoneOtpForm } from "@/components/PhoneOtpForm";
import type { OAuthProvider } from "@/lib/auth/constants";
import { authErrorMessage } from "@/lib/auth/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured, loginFlags } from "@/lib/env";
import { isAdminHost } from "@/lib/host";
import { uz } from "@/lib/i18n/uz";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: uz.nav.login };

type SearchParams = Promise<{ next?: string; sabab?: string; xato?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/");
  const admin = isAdminHost((await headers()).get("host"));

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <Notice tone="error">{uz.errors.notConfigured}</Notice>
      </div>
    );
  }

  if (await getCurrentUser()) redirect(next);

  const flags = loginFlags();
  const providers: OAuthProvider[] = ["google"];
  if (flags.apple) providers.push("apple");
  if (flags.facebook) providers.push("facebook");

  const reason =
    sp.sabab === "device"
      ? uz.auth.reasons.device
      : sp.sabab === "device-removed"
        ? uz.auth.reasons.deviceRemoved
        : sp.sabab === "chiqdi"
        ? uz.auth.reasons.loggedOut
        : sp.sabab === "kerak"
          ? uz.auth.reasons.loginRequired
          : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{admin ? uz.auth.adminTitle : uz.auth.title}</h1>
        <p className="mt-2 text-sm text-muted">{uz.auth.lead}</p>

        <div className="mt-6 space-y-3">
          {reason ? <Notice tone={sp.sabab?.startsWith("device") ? "error" : "info"}>{reason}</Notice> : null}
          {sp.xato ? <Notice tone="error">{authErrorMessage(sp.xato)}</Notice> : null}
        </div>

        <div className="mt-6">
          <PhoneOtpForm purpose="login" next={next} />
        </div>

        <div className="my-6 flex items-center gap-3 text-sm text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {uz.common.or}
          <span className="h-px flex-1 bg-border" />
        </div>

        <OAuthButtons providers={providers} next={next} />

        {!admin ? <p className="mt-6 text-sm text-muted">{uz.auth.linkHint}</p> : null}
      </div>
    </div>
  );
}
