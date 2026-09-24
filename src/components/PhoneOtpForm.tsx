"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Notice } from "@/components/Notice";
import { postJson } from "@/lib/api/client";
import { uz } from "@/lib/i18n/uz";
import { formatLocalDigits } from "@/lib/phone";

const RESEND_SECONDS = 60;

type Props = {
  /** login: log in / sign up. link: add a phone to the logged-in account. */
  purpose: "login" | "link";
  next?: string;
  /** Called after a successful "link". (Login reloads the page instead.) */
  onLinked?: () => void;
};

export function PhoneOtpForm({ purpose, next = "/", onLinked }: Props) {
  const id = useId();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const phone = `998${digits}`;

  async function sendCode() {
    setError(null);
    if (digits.length !== 9) {
      setError(uz.errors.invalidPhone);
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    const res = await postJson<{ maskedPhone: string }>("/api/auth/otp/send", { phone, purpose });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      if (res.code === "over_sms_send_rate_limit" && step === "code") setCooldown(RESEND_SECONDS);
      return;
    }
    setMasked(res.maskedPhone);
    setCode("");
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function verify(value: string) {
    setError(null);
    if (!/^\d{6}$/.test(value)) {
      setError(uz.errors.invalidCode);
      return;
    }
    setBusy(true);
    const res = await postJson<{ next: string }>("/api/auth/otp/verify", { phone, code: value, purpose, next });
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      setCode("");
      codeRef.current?.focus();
      return;
    }
    if (purpose === "link") {
      setBusy(false);
      onLinked?.();
      return;
    }
    // Full page load so every server component sees the new session.
    window.location.assign(res.next);
  }

  const errorId = `${id}-error`;

  if (step === "phone") {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor={`${id}-phone`} className="label">
            {uz.auth.phoneLabel}
          </label>
          <div className="flex items-stretch overflow-hidden rounded-lg border border-border-strong bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
            <span className="flex items-center border-r border-border bg-surface-muted px-3 font-mono text-base text-text" aria-hidden="true">
              +998
            </span>
            <input
              ref={phoneRef}
              id={`${id}-phone`}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="90 123 45 67"
              value={formatLocalDigits(digits)}
              onChange={(e) => {
                let d = e.target.value.replace(/\D/g, "");
                if (d.length > 9 && d.startsWith("998")) d = d.slice(3);
                setDigits(d.slice(0, 9));
              }}
              aria-describedby={error ? errorId : `${id}-hint`}
              aria-invalid={Boolean(error)}
              className="min-h-11 w-full bg-transparent px-3 font-mono text-base tracking-wide text-text outline-none placeholder:text-muted"
            />
          </div>
          <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
            {uz.auth.phoneHint}
          </p>
        </div>
        {error ? (
          <div id={errorId}>
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? uz.auth.sending : uz.auth.sendCode}
        </button>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted" aria-live="polite">
        {uz.auth.codeSentTo(masked)}{" "}
        <button
          type="button"
          className="link"
          onClick={() => {
            setStep("phone");
            setError(null);
          }}
        >
          {uz.auth.changePhone}
        </button>
      </p>
      <div>
        <label htmlFor={`${id}-code`} className="label">
          {uz.auth.codeLabel}
        </label>
        <input
          ref={codeRef}
          id={`${id}-code`}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6 && !busy) void verify(v);
          }}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="input text-center font-mono text-2xl tracking-[0.5em]"
        />
      </div>
      {error ? (
        <div id={errorId}>
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={busy || code.length !== 6}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? uz.auth.verifying : uz.auth.verify}
      </button>
      <div className="text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-muted" aria-live="off">
            {uz.auth.resendIn(cooldown)}
          </span>
        ) : (
          <button type="button" className="link min-h-11" onClick={() => void sendCode()} disabled={busy}>
            {uz.auth.resend}
          </button>
        )}
      </div>
    </form>
  );
}
