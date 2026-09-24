"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { AppleIcon, FacebookIcon, GoogleIcon } from "@/components/BrandIcons";
import { Notice } from "@/components/Notice";
import { PhoneOtpForm } from "@/components/PhoneOtpForm";
import type { OAuthProvider } from "@/lib/auth/constants";
import { authErrorMessage } from "@/lib/auth/errors";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

type Props = {
  phone: string | null;
  phoneVerified: boolean;
  linkedProviders: string[]; // e.g. ["google"]
  enabledProviders: OAuthProvider[]; // providers the site offers
};

const providerMeta: Record<OAuthProvider, { label: string; Icon: () => React.ReactElement }> = {
  google: { label: uz.profile.methodGoogle, Icon: GoogleIcon },
  apple: { label: uz.profile.methodApple, Icon: AppleIcon },
  facebook: { label: uz.profile.methodFacebook, Icon: FacebookIcon },
};

export function LinkedMethods({ phone, phoneVerified, linkedProviders, enabledProviders }: Props) {
  const router = useRouter();
  const [phoneFormOpen, setPhoneFormOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = (["google", "apple", "facebook"] as const).filter(
    (p) => enabledProviders.includes(p) || linkedProviders.includes(p),
  );
  const methodCount = (phoneVerified ? 1 : 0) + linkedProviders.filter((p) => p !== "phone").length;

  async function link(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    const { error: err } = await createClient().auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profil")}` },
    });
    if (err) {
      setPending(null);
      setError(authErrorMessage(err.code));
    }
  }

  async function unlink(provider: OAuthProvider) {
    if (!window.confirm(uz.profile.unlinkConfirm(providerMeta[provider].label))) return;
    setError(null);
    setPending(provider);
    const supabase = createClient();
    const { data, error: listErr } = await supabase.auth.getUserIdentities();
    const identity = data?.identities.find((i) => i.provider === provider);
    if (listErr || !identity) {
      setPending(null);
      setError(uz.errors.generic);
      return;
    }
    const { error: err } = await supabase.auth.unlinkIdentity(identity);
    setPending(null);
    if (err) {
      setError(authErrorMessage(err.code));
      return;
    }
    await supabase.auth.refreshSession();
    router.refresh();
  }

  const row = "flex min-h-14 flex-wrap items-center justify-between gap-3 py-3";

  return (
    <div>
      <ul className="divide-y divide-border">
        <li className={row}>
          <span className="flex items-center gap-3">
            <Smartphone className="size-5 text-muted" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{uz.profile.methodPhone}</span>
              {phone ? <span className="font-mono text-sm text-muted">{formatUzPhone(phone)}</span> : null}
            </span>
          </span>
          {phoneVerified ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {uz.profile.linked}
            </span>
          ) : (
            <button
              type="button"
              className="btn-primary"
              aria-expanded={phoneFormOpen}
              onClick={() => setPhoneFormOpen((v) => !v)}
            >
              {uz.profile.verifyPhone}
            </button>
          )}
        </li>
        {!phoneVerified && phoneFormOpen ? (
          <li className="py-4">
            <PhoneOtpForm
              purpose="link"
              onLinked={() => {
                setPhoneFormOpen(false);
                router.refresh();
              }}
            />
          </li>
        ) : null}
        {shown.map((p) => {
          const { label, Icon } = providerMeta[p];
          const linked = linkedProviders.includes(p);
          return (
            <li key={p} className={row}>
              <span className="flex items-center gap-3">
                <Icon />
                <span className="font-semibold">{label}</span>
              </span>
              {linked ? (
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {uz.profile.linked}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void unlink(p)}
                    disabled={pending !== null || methodCount <= 1}
                    title={methodCount <= 1 ? uz.errors.lastMethod : undefined}
                  >
                    {pending === p ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    {uz.profile.unlink}
                  </button>
                </span>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => void link(p)} disabled={pending !== null}>
                  {pending === p ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {uz.profile.link}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </div>
  );
}
