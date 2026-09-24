"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uz } from "@/lib/i18n/uz";
import { postLogin } from "@/components/TelegramLoginButton";

// Only rendered when ALLOW_DEV_LOGIN=true on a local (non-production) server.
export function DevLoginButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    const result = await postLogin("/api/auth/dev", { telegramId: 1 });
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.replace(result.redirect ?? "/learn");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={login} disabled={busy} className="btn-secondary w-full">
        {busy ? uz.landing.loggingIn : uz.landing.devLogin}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
