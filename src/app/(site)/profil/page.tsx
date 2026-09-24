import type { Metadata } from "next";
import { BadgeCheck, LifeBuoy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { Notice } from "@/components/Notice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeviceList, type DeviceItem } from "@/components/profile/DeviceList";
import { LinkedMethods } from "@/components/profile/LinkedMethods";
import { NameForm } from "@/components/profile/NameForm";
import type { OAuthProvider } from "@/lib/auth/constants";
import { currentDeviceId } from "@/lib/auth/device";
import { authErrorMessage } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { loginFlags } from "@/lib/env";
import { describeUserAgent, formatDate, formatDateTime, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.profile.title };

// Phase 1: profile as a page. Phase 2 shows the same sections in the slide-in right panel.
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  const { xato } = await searchParams;
  const current = await requireUser("/profil");
  const supabase = await createClient();

  const [{ data: authUser }, devicesRes, ordersRes, deviceId] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("device_sessions")
      .select("id, device_id, user_agent, last_seen_at")
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, final_amount, paid_at, product_type, courses(title), bundles(title)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
    currentDeviceId(),
  ]);

  const profile = current.profile;
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Notice tone="error">{uz.profile.loadError}</Notice>
      </div>
    );
  }

  const linkedProviders = (authUser.user?.identities ?? []).map((i) => i.provider);
  const flags = loginFlags();
  const enabledProviders: OAuthProvider[] = ["google"];
  if (flags.apple) enabledProviders.push("apple");
  if (flags.facebook) enabledProviders.push("facebook");

  const devices: DeviceItem[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    label: describeUserAgent(d.user_agent) ?? uz.profile.unknownDevice,
    lastSeen: formatDateTime(d.last_seen_at),
    current: d.device_id === deviceId,
  }));

  const section = "card p-5 sm:p-6";
  const heading = "text-lg font-bold";

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:py-12">
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name || "?"} url={profile.avatar_url} size={64} />
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || uz.profile.title}</h1>
          <p className="text-sm text-muted">{profile.email ?? (profile.phone ? formatUzPhone(profile.phone) : "")}</p>
        </div>
      </div>

      {xato ? <Notice tone="error">{authErrorMessage(xato)}</Notice> : null}

      <section className={section} aria-labelledby="personal">
        <h2 id="personal" className={heading}>
          {uz.profile.personal}
        </h2>
        <div className="mt-4 space-y-5">
          <NameForm initialName={profile.full_name} />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold">{uz.profile.phone}</dt>
              <dd className="mt-1 flex items-center gap-2">
                {profile.phone ? <span className="font-mono">{formatUzPhone(profile.phone)}</span> : <span className="text-muted">{uz.profile.phoneMissing}</span>}
                {profile.phone_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {uz.profile.phoneVerified}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{uz.profile.email}</dt>
              <dd className="mt-1 break-all">{profile.email ?? <span className="text-muted">{uz.profile.emailMissing}</span>}</dd>
            </div>
          </dl>
          {!profile.phone_verified ? <Notice>{uz.profile.phoneRequiredNote}</Notice> : null}
        </div>
      </section>

      <section className={section} aria-labelledby="methods">
        <h2 id="methods" className={heading}>
          {uz.profile.methods}
        </h2>
        <p className="mt-1 text-sm text-muted">{uz.profile.methodsLead}</p>
        <div className="mt-2">
          <LinkedMethods
            phone={profile.phone}
            phoneVerified={profile.phone_verified}
            linkedProviders={linkedProviders}
            enabledProviders={enabledProviders}
          />
        </div>
      </section>

      <section className={section} aria-labelledby="purchases">
        <h2 id="purchases" className={heading}>
          {uz.profile.purchases}
        </h2>
        {ordersRes.data && ordersRes.data.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {ordersRes.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <span className="block font-semibold">{o.courses?.title ?? o.bundles?.title ?? "—"}</span>
                  {o.paid_at ? <span className="text-sm text-muted">{formatDate(o.paid_at)}</span> : null}
                </span>
                <span className="font-semibold">{formatSom(o.final_amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{uz.profile.purchasesEmpty}</p>
        )}
      </section>

      <section className={section} aria-labelledby="devices">
        <h2 id="devices" className={heading}>
          {uz.profile.devices}
        </h2>
        <p className="mt-1 text-sm text-muted">{uz.profile.devicesLead}</p>
        <div className="mt-2">
          {devicesRes.error ? <Notice tone="error">{uz.errors.generic}</Notice> : <DeviceList devices={devices} />}
        </div>
      </section>

      <section className={section} aria-labelledby="theme">
        <h2 id="theme" className={heading}>
          {uz.profile.theme}
        </h2>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </section>

      <section className={section} aria-labelledby="support">
        <h2 id="support" className={heading}>
          {uz.profile.support}
        </h2>
        <p className="mt-1 text-sm text-muted">{uz.profile.supportText}</p>
        <a href={uz.brand.supportUrl} className="btn-secondary mt-3" target="_blank" rel="noopener noreferrer">
          <LifeBuoy className="size-4" aria-hidden="true" />
          {uz.profile.supportLink}
        </a>
      </section>

      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}
