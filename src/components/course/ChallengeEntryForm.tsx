"use client";

/* eslint-disable @next/next/no-img-element -- screenshot preview from Supabase Storage */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Send, Trash2 } from "lucide-react";
import { submitChallengeEntry } from "@/app/(site)/challenge/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/client";

const t = uz.challenge;
const MAX = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ChallengeEntryForm({
  challengeId,
  slug,
  userId,
  initial,
}: {
  challengeId: string;
  slug: string;
  userId: string;
  initial: { link_url: string; summary: string; image_path: string | null } | null;
}) {
  const router = useRouter();
  const [link, setLink] = useState(initial?.link_url ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [image, setImage] = useState<string | null>(initial?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const publicUrl = (path: string) => createClient().storage.from("challenge-images").getPublicUrl(path).data.publicUrl;

  const upload = async (file: File) => {
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX) return setMsg({ tone: "error", text: t.imageError });
    setUploading(true);
    setMsg(null);
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("challenge-images").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setMsg({ tone: "error", text: t.imageError });
    // An unsaved earlier upload is removed right away.
    if (image && image !== initial?.image_path) await createClient().storage.from("challenge-images").remove([image]);
    setImage(path);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setMsg(null);
      const res = await submitChallengeEntry({ challengeId, slug, link_url: link, summary, image_path: image });
      setMsg(res.ok ? { tone: "success", text: t.submitted } : { tone: "error", text: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="ch-link" className="label">
          {t.link}
        </label>
        <input id="ch-link" className="input" type="url" inputMode="url" required maxLength={1000} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ch-summary" className="label">
          {t.summary}
        </label>
        <textarea id="ch-summary" className="input min-h-24 py-2" maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div>
        <p className="label">{t.image}</p>
        {image ? (
          <div className="space-y-2">
            <img src={publicUrl(image)} alt="" className="max-h-60 rounded-lg border border-border object-contain" />
            <button type="button" className="btn-ghost text-sm text-danger" onClick={() => setImage(null)}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.imageRemove}
            </button>
          </div>
        ) : (
          <label className="btn-secondary cursor-pointer">
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImageUp className="size-4" aria-hidden="true" />}
            {uploading ? t.imageUploading : t.imageButton}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
        )}
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <button type="submit" className="btn-primary" disabled={pending || uploading}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {pending ? t.submitting : initial ? t.update : t.submit}
      </button>
    </form>
  );
}
