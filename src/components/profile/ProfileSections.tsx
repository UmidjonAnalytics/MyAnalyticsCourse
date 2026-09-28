import { BadgeCheck, LifeBuoy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { Notice } from "@/components/Notice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DeviceList, type DeviceItem } from "@/components/profile/DeviceList";
import { LinkedMethods } from "@/components/profile/LinkedMethods";
import { NameForm } from "@/components/profile/NameForm";
import { visibleEmail, type OAuthProvider } from "@/lib/auth/constants";
import { currentDeviceId } from "@/lib/auth/device";
import { loginFlags } from "@/lib/env";
import { describeUserAgent, formatDate, formatDateTime, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

// Everything in the profile: used by the /profil page and by the slide-in right panel.
// `compact` = narrower spacing for the panel.
export async function ProfileSections({ compact = false }: { compact?: boolean }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: authUser }, devicesRes, ordersRes, deviceId] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from("device_sessions")
      .select("id, device_id, user_agent, last_seen_at")
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, final_amount, paid_at, courses(title), bundles(title)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
    currentDeviceId(),
  ]);

  if (!profile) return <Notice tone="error">{uz.profile.loadError}</Notice>;

  const email = visibleEmail(profile.email);
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

  const section = compact ? "border-t border-border pt-5" : "card p-5 sm:p-6";
  const heading = compact ? "text-base font-bold" : "text-lg font-bold";
  const idp = compact ? "p-" : "";

  return (
    <div className={compact ? "space-y-5" : "space-y-5"}>
      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name || "?"} url={profile.avatar_url} size={compact ? 52 : 64} />
        <div className="min-w-0">
          <p className={`${compact ? "text-lg" : "text-2xl"} truncate font-display font-bold`}>
            {profile.full_name || uz.profile.title}
          </p>
          <p className="truncate text-sm text-muted">{email ?? (profile.phone ? formatUzPhone(profile.phone) : "")}</p>
        </div>
      </div>

      <section className={section} aria-labelledby={`${idp}personal`}>
        <h2 id={`${idp}personal`} className={heading}>
          {uz.profile.personal}
        </h2>
        <div className="mt-4 space-y-5">
          <NameForm initialName={profile.full_name} />
          <dl className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
            <div>
              <dt className="text-sm font-semibold">{uz.profile.phone}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                {profile.phone ? (
                  <span className="font-mono">{formatUzPhone(profile.phone)}</span>
                ) : (
                  <span className="text-muted">{uz.profile.phoneMissing}</span>
                )}
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
              <dd className="mt-1 break-all">{email ?? <span className="text-muted">{uz.profile.emailMissing}</span>}</dd>
            </div>
          </dl>
          {!profile.phone_verified ? <Notice>{uz.profile.phoneRequiredNote}</Notice> : null}
        </div>
      </section>

      <section className={section} aria-labelledby={`${idp}methods`}>
        <h2 id={`${idp}methods`} className={heading}>
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

      <section className={section} aria-labelledby={`${idp}purchases`}>
        <h2 id={`${idp}purchases`} className={heading}>
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

      <section className={section} aria-labelledby={`${idp}devices`}>
        <h2 id={`${idp}devices`} className={heading}>
          {uz.profile.devices}
        </h2>
        <p className="mt-1 text-sm text-muted">{uz.profile.devicesLead}</p>
        <div className="mt-2">
          {devicesRes.error ? <Notice tone="error">{uz.errors.generic}</Notice> : <DeviceList devices={devices} />}
        </div>
      </section>

      <section className={section} aria-labelledby={`${idp}theme`}>
        <h2 id={`${idp}theme`} className={heading}>
          {uz.profile.theme}
        </h2>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </section>

      <section className={section} aria-labelledby={`${idp}support`}>
        <h2 id={`${idp}support`} className={heading}>
          {uz.profile.support}
        </h2>
        <p className="mt-1 text-sm text-muted">{uz.profile.supportText}</p>
        <a href={uz.brand.supportUrl} className="btn-secondary mt-3" target="_blank" rel="noopener noreferrer">
          <LifeBuoy className="size-4" aria-hidden="true" />
          {uz.profile.supportLink}
        </a>
      </section>

      <div className={compact ? "border-t border-border pt-5" : "pt-2"}>
        <LogoutButton />
      </div>
    </div>
  );
}
