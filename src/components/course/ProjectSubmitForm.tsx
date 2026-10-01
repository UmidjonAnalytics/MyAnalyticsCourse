"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { submitProject } from "@/app/(site)/loyiha/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

const t = uz.projects;

export function ProjectSubmitForm({
  projectId,
  slug,
  initial,
}: {
  projectId: string;
  slug: string;
  initial: { link_url: string; summary: string; is_public: boolean } | null;
}) {
  const router = useRouter();
  const [link, setLink] = useState(initial?.link_url ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setMsg(null);
      const res = await submitProject({ projectId, slug, link_url: link, summary, is_public: isPublic });
      setMsg(res.ok ? { tone: "success", text: t.submitted } : { tone: "error", text: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="proj-link" className="label">
          {t.link}
        </label>
        <input
          id="proj-link"
          className="input"
          type="url"
          inputMode="url"
          required
          maxLength={1000}
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="proj-summary" className="label">
          {t.summary}
        </label>
        <textarea
          id="proj-summary"
          className="input min-h-28 py-2"
          maxLength={4000}
          placeholder={t.summaryPlaceholder}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        <span className="text-sm">{t.isPublic}</span>
      </label>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {pending ? t.submitting : initial ? t.resubmit : t.submit}
      </button>
    </form>
  );
}
