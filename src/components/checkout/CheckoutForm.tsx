"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Tag, X } from "lucide-react";
import { getQuote, startCheckout } from "@/app/(site)/tolov/actions";
import { Notice } from "@/components/Notice";
import { PhoneOtpForm } from "@/components/PhoneOtpForm";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import type { Quote } from "@/lib/payments/orders";
import type { ProviderName } from "@/lib/payments/types";

const t = uz.checkout;

export function CheckoutForm({
  productRef,
  initialQuote,
  providers,
  phoneVerified,
  cardForm,
}: {
  productRef: { type: "kurs" | "toplam"; slug: string };
  initialQuote: Quote;
  providers: Array<{ name: ProviderName; enabled: boolean }>;
  phoneVerified: boolean;
  cardForm: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuote);
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderName | null>(providers.find((p) => p.enabled)?.name ?? null);
  const [card, setCard] = useState(cardForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [promoPending, startPromo] = useTransition();

  const applyPromo = (code: string | null) =>
    startPromo(async () => {
      setPromoError(null);
      const res = await getQuote(productRef, code);
      if (res.ok) {
        setQ(res.quote);
        if (!code) setPromo("");
      } else setPromoError(res.error);
    });

  const pay = () =>
    startTransition(async () => {
      if (!provider) return;
      setError(null);
      const res = await startCheckout({ ref: productRef, promo: q.promo?.code ?? null, provider, card: provider === "payme" && card });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.url.startsWith("/")) router.push(res.url);
      else window.location.assign(res.url);
    });

  const anyEnabled = providers.some((p) => p.enabled);

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6" aria-labelledby="summary">
        <h2 id="summary" className="sr-only">
          {t.title}
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.product}</dt>
            <dd className="text-right font-semibold">{q.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.listPrice}</dt>
            <dd>{formatSom(q.listPrice)}</dd>
          </div>
          {q.upgradeDiscount > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t.upgradeDiscount}</dt>
              <dd className="text-accent-text">−{formatSom(q.upgradeDiscount)}</dd>
            </div>
          ) : null}
          {q.promoDiscount > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                {t.promoDiscount} ({q.promo?.code})
              </dt>
              <dd className="text-accent-text">−{formatSom(q.promoDiscount)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold">{t.total}</dt>
            <dd className="font-display text-2xl font-bold">{formatSom(q.finalAmount)}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          {q.promo ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <Tag className="size-4 text-accent-text" aria-hidden="true" />
              <span className="font-semibold text-accent-text">{t.promoApplied(q.promo.code)}</span>
              <button type="button" className="btn-ghost min-h-9 text-xs" onClick={() => applyPromo(null)} disabled={promoPending}>
                <X className="size-3.5" aria-hidden="true" />
                {t.promoRemove}
              </button>
            </p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (promo.trim()) applyPromo(promo.trim());
              }}
            >
              <label htmlFor="promo" className="sr-only">
                {t.promo}
              </label>
              <input
                id="promo"
                value={promo}
                onChange={(e) => setPromo(e.target.value.toUpperCase())}
                placeholder={t.promoPlaceholder}
                maxLength={40}
                autoCapitalize="characters"
                className="input font-mono text-sm uppercase"
                aria-describedby={promoError ? "promo-error" : undefined}
              />
              <button type="submit" className="btn-secondary shrink-0" disabled={promoPending || !promo.trim()}>
                {promoPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t.promoApply}
              </button>
            </form>
          )}
          {promoError ? (
            <p id="promo-error" role="alert" className="mt-2 text-sm font-semibold text-danger">
              {promoError}
            </p>
          ) : null}
        </div>
      </section>

      {!phoneVerified ? (
        <section className="card space-y-4 p-5 sm:p-6">
          <Notice>{t.phoneRequired}</Notice>
          <PhoneOtpForm purpose="link" onLinked={() => router.refresh()} />
        </section>
      ) : (
        <section className="card p-5 sm:p-6" aria-labelledby="method">
          <h2 id="method" className="font-bold">
            {t.method}
          </h2>
          {!anyEnabled ? (
            <div className="mt-3">
              <Notice>{t.noProviders}</Notice>
            </div>
          ) : (
            <div role="radiogroup" aria-labelledby="method" className="mt-3 grid gap-2">
              {providers.map((p) => (
                <label
                  key={p.name}
                  className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-2 ${
                    !p.enabled ? "cursor-not-allowed opacity-60" : provider === p.name ? "border-accent bg-accent-soft" : "border-border-strong hover:bg-surface-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.name}
                    disabled={!p.enabled}
                    checked={provider === p.name}
                    onChange={() => setProvider(p.name)}
                    className="size-5 accent-[var(--accent)]"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{t.providers[p.name]}</span>
                    <span className="text-xs text-muted">{p.enabled ? t.providerHints[p.name] : uz.common.soon}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {provider === "payme" && cardForm ? (
            <fieldset className="mt-4">
              <legend className="sr-only">{t.method}</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex min-h-11 items-center gap-2">
                  <input type="radio" name="payme-mode" checked={card} onChange={() => setCard(true)} className="size-5 accent-[var(--accent)]" />
                  {t.cardHere}
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="radio" name="payme-mode" checked={!card} onChange={() => setCard(false)} className="size-5 accent-[var(--accent)]" />
                  {t.cardRedirect}
                </label>
              </div>
            </fieldset>
          ) : null}

          {error ? (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}

          <button type="button" className="btn-primary mt-5 w-full" onClick={pay} disabled={pending || !provider || !anyEnabled}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            {pending ? t.paying : t.pay(formatSom(q.finalAmount))}
          </button>
          <p className="mt-3 text-xs text-muted">{t.secure}</p>
        </section>
      )}
    </div>
  );
}
