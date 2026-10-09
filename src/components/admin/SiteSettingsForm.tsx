"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { saveReferralSettings, saveSitePage, saveSiteSettings } from "@/app/admin/(panel)/actions/site";
import { MarkdownField } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import type { SitePage, SiteSettings } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.settings;
type Editable = Omit<SiteSettings, "id" | "updated_at" | "referral_enabled" | "referral_friend_percent" | "referral_reward_percent">;
type Referral = Pick<SiteSettings, "referral_enabled" | "referral_friend_percent" | "referral_reward_percent">;

export function SiteSettingsForm({ settings }: { settings: Editable }) {
  const [v, setV] = useState(settings);
  const [pending, startTransition] = useTransition();
  const field = (k: keyof Editable, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`ss-${k}`} className="label">
        {label}
      </label>
      <input id={`ss-${k}`} className="input" value={v[k]} onChange={(e) => setV((cur) => ({ ...cur, [k]: e.target.value }))} {...extra} />
    </div>
  );
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveSiteSettings(v);
          if (res.ok) toast(res.message ?? t.saved);
          else toast(res.error, "error");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        {field("company_name", t.company, { maxLength: 200, placeholder: "MChJ \"...\"" })}
        {field("stir", t.stir, { inputMode: "numeric", maxLength: 9, placeholder: "123456789" })}
      </div>
      {field("address", t.address, { maxLength: 300 })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("phone", t.phone, { type: "tel", maxLength: 40, placeholder: "+998 90 123 45 67" })}
        {field("email", t.email, { type: "email", maxLength: 200 })}
        {field("telegram_url", t.telegram, { type: "url", placeholder: "https://t.me/..." })}
        {field("instagram_url", t.instagram, { type: "url", placeholder: "https://instagram.com/..." })}
      </div>
      {field("support_hours", t.hours, { maxLength: 100 })}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        {t.save}
      </button>
    </form>
  );
}

/** "Do'st taklifi": invite discount for the friend and reward code for the student who invited. */
export function ReferralSettingsForm({ settings }: { settings: Referral }) {
  const r = uz.admin.referral;
  const [enabled, setEnabled] = useState(settings.referral_enabled);
  const [friend, setFriend] = useState(String(settings.referral_friend_percent));
  const [reward, setReward] = useState(String(settings.referral_reward_percent));
  const [pending, startTransition] = useTransition();
  const pct = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} className="input w-24" inputMode="numeric" value={value} onChange={(e) => set(e.target.value.trim())} disabled={!enabled} />
        <span className="text-muted">%</span>
      </div>
    </div>
  );
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      aria-labelledby="referral-title"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveReferralSettings({ referral_enabled: enabled, referral_friend_percent: Number(friend), referral_reward_percent: Number(reward) });
          if (res.ok) toast(res.message ?? t.saved);
          else toast(res.error, "error");
        });
      }}
    >
      <div>
        <h2 id="referral-title" className="text-lg font-bold">
          {r.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{r.lead}</p>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="font-semibold">{r.enabled}</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {pct("ref-friend", r.friendPercent, friend, setFriend)}
        {pct("ref-reward", r.rewardPercent, reward, setReward)}
      </div>
      <p className="text-xs text-muted">{r.hint}</p>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        {t.save}
      </button>
    </form>
  );
}

export function SitePageForm({ page, siteUrl }: { page: Pick<SitePage, "slug" | "title" | "body_md">; siteUrl: string | null }) {
  const [title, setTitle] = useState(page.title);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="card space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const body_md = String(new FormData(e.currentTarget).get("body_md") ?? "");
        startTransition(async () => {
          const res = await saveSitePage({ slug: page.slug as "oferta" | "maxfiylik" | "qaytarish", title, body_md });
          if (res.ok) toast(res.message ?? t.saved);
          else toast(res.error, "error");
        });
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`sp-${page.slug}`} className="label">
            {t.pageTitle}
          </label>
          <input id={`sp-${page.slug}`} className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {siteUrl ? (
          <a href={`${siteUrl}/${page.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            {t.open}: /{page.slug}
          </a>
        ) : null}
      </div>
      <MarkdownField name="body_md" label={t.pageBody} defaultValue={page.body_md} rows={14} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        {t.savePage}
      </button>
    </form>
  );
}
