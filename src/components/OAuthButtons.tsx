"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppleIcon, FacebookIcon, GoogleIcon } from "@/components/BrandIcons";
import { Notice } from "@/components/Notice";
import type { OAuthProvider } from "@/lib/auth/constants";
import { authErrorMessage } from "@/lib/auth/errors";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/client";

const meta: Record<OAuthProvider, { label: string; Icon: () => React.ReactElement }> = {
  google: { label: uz.auth.google, Icon: GoogleIcon },
  apple: { label: uz.auth.apple, Icon: AppleIcon },
  facebook: { label: uz.auth.facebook, Icon: FacebookIcon },
};

export function OAuthButtons({ providers, next = "/" }: { providers: OAuthProvider[]; next?: string }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: OAuthProvider) {
    setError(null);
    setPending(provider);
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: provider === "facebook" ? "email" : undefined,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    // On success the browser is already leaving the page.
    if (err) {
      setPending(null);
      setError(authErrorMessage(err.code));
    }
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => {
        const { label, Icon } = meta[p];
        return (
          <button key={p} type="button" className="btn-secondary w-full" onClick={() => void signIn(p)} disabled={pending !== null}>
            {pending === p ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Icon />}
            {pending === p ? uz.auth.redirecting : label}
          </button>
        );
      })}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
