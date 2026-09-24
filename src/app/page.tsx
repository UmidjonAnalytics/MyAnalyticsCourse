import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { DevLoginButton } from "@/components/DevLoginButton";
import { devLoginEnabled } from "@/lib/env";
import { uz } from "@/lib/i18n/uz";

type Props = { searchParams: Promise<{ sabab?: string }> };

export default async function LandingPage({ searchParams }: Props) {
  const { sabab } = await searchParams;
  const reason = sabab === "device" || sabab === "expired" ? uz.signOutReasons[sabab] : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center">
        <Logo />
      </header>

      <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <section className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{uz.landing.title}</h1>
          <p className="max-w-xl text-lg text-muted">{uz.landing.description}</p>
          <ul className="space-y-3">
            {uz.landing.points.map((point) => (
              <li key={point} className="flex gap-3">
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-text" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="login-title" className="card space-y-6 p-6 sm:p-8">
          {reason && <Notice tone="warning">{reason}</Notice>}
          <div className="space-y-2">
            <h2 id="login-title" className="text-2xl font-bold">
              {uz.landing.loginTitle}
            </h2>
            <p className="text-sm text-muted">{uz.landing.loginHint}</p>
          </div>
          <TelegramLoginButton />
          {devLoginEnabled() && <DevLoginButton />}
          <div className="rounded-lg bg-surface-muted p-4">
            <p className="text-sm text-muted">{uz.landing.priceLabel}</p>
            <p className="font-display text-2xl font-bold">{uz.landing.price}</p>
            <p className="text-sm text-muted">{uz.landing.priceNote}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
