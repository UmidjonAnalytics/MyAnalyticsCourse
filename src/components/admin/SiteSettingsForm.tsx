"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { saveSitePage, saveSiteSettings } from "@/app/admin/(panel)/actions/site";
import { MarkdownField } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import type { SitePage, SiteSettings } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.settings;
type Editable = Omit<SiteSettings, "id" | "updated_at">;

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
