"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { Notice } from "@/components/Notice";
import { postJson } from "@/lib/api/client";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

const t = uz.card;
const RESEND = 60;

// Payme Subscribe API from the BROWSER (card data goes straight to Payme, never to our server):
// cards.create -> cards.get_verify_code (SMS) -> cards.verify. Then our server pays the receipt with the token.
async function payme<T>(apiUrl: string, merchantId: string, method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Auth": merchantId },
    body: JSON.stringify({ id: Date.now(), method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { code: number; message: unknown } };
  if (json.error || !json.result) throw new Error(String(json.error?.code ?? "payme_error"));
  return json.result;
}

function formatCard(d: string) {
  return d.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function PaymeCardForm({ orderId, amount, merchantId, apiUrl }: { orderId: string; amount: number; merchantId: string; apiUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"card" | "code">("card");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendCode(cardToken: string) {
    const r = await payme<{ sent: boolean; phone: string; wait: number }>(apiUrl, merchantId, "cards.get_verify_code", { token: cardToken });
    setPhone(r.phone);
    setCooldown(Math.round((r.wait || RESEND * 1000) / 1000));
  }

  async function submitCard() {
    setError(null);
    const digits = number.replace(/\D/g, "");
    const exp = expiry.replace(/\D/g, "");
    if (digits.length !== 16) return setError(t.invalidNumber);
    if (exp.length !== 4 || Number(exp.slice(0, 2)) < 1 || Number(exp.slice(0, 2)) > 12) return setError(t.invalidExpiry);
    setBusy(true);
    try {
      const r = await payme<{ card: { token: string } }>(apiUrl, merchantId, "cards.create", { card: { number: digits, expire: exp }, save: false });
      setToken(r.card.token);
      await sendCode(r.card.token);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 0);
    } catch {
      setError(t.cardError);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    if (!/^\d{4,6}$/.test(code)) return setError(t.codeError);
    setBusy(true);
    try {
      await payme(apiUrl, merchantId, "cards.verify", { token, code });
    } catch {
      setBusy(false);
      return setError(t.codeError);
    }
    const res = await postJson("/api/payments/payme/card", { orderId, token });
    if (!res.ok) {
      setBusy(false);
      return setError(t.payError);
    }
    router.push(`/tolov/natija/${orderId}`);
  }

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <CreditCard className="size-5 text-accent-text" aria-hidden="true" />
          {t.title}
        </h1>
        <span className="font-display text-xl font-bold">{formatSom(amount)}</span>
      </div>

      {step === "card" ? (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submitCard();
          }}
        >
          <div>
            <label htmlFor="cc-number" className="label">
              {t.number}
            </label>
            <input
              id="cc-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder={t.numberPlaceholder}
              value={formatCard(number)}
              onChange={(e) => setNumber(e.target.value)}
              className="input font-mono tracking-wider"
            />
          </div>
          <div className="max-w-40">
            <label htmlFor="cc-exp" className="label">
              {t.expiry}
            </label>
            <input
              id="cc-exp"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t.expiryPlaceholder}
              value={expiry}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
              }}
              className="input font-mono"
            />
          </div>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? t.sending : t.continue}
          </button>
        </form>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <p className="text-sm text-muted" aria-live="polite">
            {t.codeSent(phone)}
          </p>
          <div>
            <label htmlFor="cc-code" className="label">
              {t.code}
            </label>
            <input
              ref={codeRef}
              id="cc-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input text-center font-mono text-2xl tracking-[0.5em]"
            />
          </div>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <button type="submit" className="btn-primary w-full" disabled={busy || code.length < 4}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? t.confirming : t.confirm}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {cooldown > 0 ? (
              <span className="text-muted">{t.resendIn(cooldown)}</span>
            ) : (
              <button
                type="button"
                className="link min-h-11"
                disabled={busy}
                onClick={() => void sendCode(token).catch(() => setError(t.cardError))}
              >
                {t.resend}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setStep("card");
                setCode("");
                setError(null);
              }}
            >
              {t.changeCard}
            </button>
          </div>
        </form>
      )}
      <p className="flex items-start gap-2 text-xs text-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t.note}
      </p>
    </div>
  );
}
