"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { publicEnv } from "@/lib/public-env";

type TelegramUser = Record<string, string | number>;

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

type LoginResponse = { ok?: boolean; redirect?: string; error?: string };

export async function postLogin(url: string, body: unknown): Promise<LoginResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as LoginResponse;
  if (!res.ok) return { error: data.error ?? uz.landing.loginFailed };
  return data;
}

// Renders the official Telegram Login Widget. Telegram only shows it on the domain set
// with @BotFather -> /setdomain.
export function TelegramLoginButton() {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const bot = publicEnv.telegramBotUsername;

  useEffect(() => {
    const el = container.current;
    if (!el || !bot) return;

    window.onTelegramAuth = async (user) => {
      setStatus("loading");
      setError(null);
      const result = await postLogin("/api/auth/telegram", user);
      if (result.error) {
        setError(result.error);
        setStatus("idle");
        return;
      }
      router.replace(result.redirect ?? "/learn");
      router.refresh();
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = bot;
    script.dataset.size = "large";
    script.dataset.radius = "8";
    script.dataset.userpic = "false";
    script.dataset.requestAccess = "write";
    script.dataset.onauth = "onTelegramAuth(user)";
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [bot, router]);

  if (!bot) {
    return <p className="text-sm text-danger">{uz.landing.widgetMissing}</p>;
  }

  return (
    <div className="space-y-3">
      <div ref={container} className="min-h-11" aria-busy={status === "loading"} />
      {status === "loading" && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {uz.landing.loggingIn}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
