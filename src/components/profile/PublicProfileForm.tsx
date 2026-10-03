"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe, Loader2, Lock } from "lucide-react";
import { savePublicProfile } from "@/app/(site)/profil/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

const t = uz.publicProfile;

export type PublicProfileFields = {
  is_public: boolean;
  username: string;
  headline: string;
  location: string;
  bio: string;
  linkedin_url: string;
  github_url: string;
  website_url: string;
};

export function PublicProfileForm({ initial, origin }: { initial: PublicProfileFields; origin: string }) {
  const [v, setV] = useState(initial);
  const [savedUsername, setSavedUsername] = useState(initial.is_public && initial.username ? initial.username : null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof PublicProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((cur) => ({ ...cur, [k]: e.target.value }));
  const link = savedUsername ? `${origin}/u/${savedUsername}` : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setMsg(null);
      const res = await savePublicProfile(v);
      if (!res.ok) return setMsg({ tone: "error", text: res.error });
      setMsg({ tone: "success", text: t.saved });
      setSavedUsername(v.is_public ? res.username : null);
    });
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  };

  const field = (k: keyof PublicProfileFields, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`pp-${k}`} className="label">
        {label}
      </label>
      <input id={`pp-${k}`} className="input" value={v[k] as string} onChange={set(k)} {...extra} />
    </div>
  );

  return (
    <section id="ommaviy" aria-labelledby="pp-title" className="card scroll-mt-6 space-y-5 p-5 sm:p-6">
      <div>
        <h2 id="pp-title" className="flex items-center gap-2 text-lg font-bold">
          <Globe className="size-5 text-accent-text" aria-hidden="true" />
          {t.sectionTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.sectionLead}</p>
      </div>

      {link ? (
        <div className="rounded-lg bg-accent-soft p-3">
          <p className="text-xs font-semibold text-muted">{t.yourLink}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a href={link} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all font-semibold text-accent-text hover:underline">
              {link.replace(/^https?:\/\//, "")}
            </a>
            <button type="button" className="btn-ghost min-h-9 px-2 text-sm" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? t.copied : t.copy}</span>
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-9 px-2 text-sm">
              <ExternalLink className="size-4" aria-hidden="true" />
              {t.open}
            </a>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="size-4" aria-hidden="true" />
          {t.privateNote}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={v.is_public}
            onChange={(e) => setV((cur) => ({ ...cur, is_public: e.target.checked }))}
            className="size-5 accent-[var(--accent)]"
          />
          <span className="font-semibold">{t.enable}</span>
        </label>
        <div>
          <label htmlFor="pp-username" className="label">
            {t.username}
          </label>
          <div className="flex items-center rounded-lg border border-border-strong bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
            <span className="shrink-0 pl-3 text-sm text-muted">/u/</span>
            <input
              id="pp-username"
              className="min-h-11 w-full min-w-0 bg-transparent px-1 pr-3 outline-none"
              value={v.username}
              onChange={(e) => setV((cur) => ({ ...cur, username: e.target.value.toLowerCase() }))}
              maxLength={30}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="pp-username-hint"
            />
          </div>
          <p id="pp-username-hint" className="mt-1 text-xs text-muted">
            {t.usernameHint}
          </p>
        </div>
        {field("headline", t.headline, { maxLength: 120, placeholder: t.headlinePlaceholder })}
        {field("location", t.location, { maxLength: 80, placeholder: t.locationPlaceholder, autoComplete: "address-level2" })}
        <div>
          <label htmlFor="pp-bio" className="label">
            {t.bio}
          </label>
          <textarea id="pp-bio" className="input min-h-24 py-2" value={v.bio} onChange={set("bio")} maxLength={1000} placeholder={t.bioPlaceholder} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("linkedin_url", t.linkedin, { type: "url", inputMode: "url", placeholder: "https://linkedin.com/in/..." })}
          {field("github_url", t.github, { type: "url", inputMode: "url", placeholder: "https://github.com/..." })}
        </div>
        {field("website_url", t.website, { type: "url", inputMode: "url", placeholder: "https://" })}
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? uz.common.saving : t.save}
        </button>
      </form>
    </section>
  );
}
