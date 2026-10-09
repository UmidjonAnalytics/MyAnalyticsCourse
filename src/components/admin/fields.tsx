"use client";

/* eslint-disable @next/next/no-img-element -- admin preview of uploaded covers */
import { startTransition, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ImageUp, Loader2, Trash2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Notice } from "@/components/Notice";
import type { FormState } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import { youtubeEmbedUrl, youtubeId } from "@/lib/youtube";

const t = uz.admin.common;

/**
 * Submits a form to a useActionState action WITHOUT React's automatic form reset, so typed values
 * stay in place when the server returns a validation error. Use with <SubmitButton pending={...} />.
 */
export function submitWith(dispatch: (payload: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
}

export function SubmitButton({ label = t.save, pending: busy }: { label?: string; pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = busy ?? formPending;
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? uz.common.saving : label}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error") return <Notice tone="error">{state.error}</Notice>;
  if (state.status === "saved")
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {state.message ?? t.saved}
      </p>
    );
  return null;
}

/** Title + slug. The slug follows the title until the admin edits the slug by hand. */
export function TitleSlugFields({ title: initialTitle = "", slug: initialSlug = "" }: { title?: string; slug?: string }) {
  const id = useId();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialSlug));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-t`} className="label">
          {t.title}
        </label>
        <input
          id={`${id}-t`}
          name="title"
          required
          maxLength={200}
          className="input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>
      <div>
        <label htmlFor={`${id}-s`} className="label">
          {t.slug}
        </label>
        <input
          id={`${id}-s`}
          name="slug"
          required
          maxLength={100}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className="input font-mono text-sm"
          value={slug}
          aria-describedby={`${id}-sh`}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        <p id={`${id}-sh`} className="mt-1 text-xs text-muted">
          {t.slugHint}
        </p>
      </div>
    </div>
  );
}

export function TextField({
  name,
  label,
  defaultValue,
  hint,
  required,
  maxLength,
  inputMode,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-h` : undefined}
        className="input"
      />
      {hint ? (
        <p id={`${id}-h`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[var(--accent)]" />
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
    </div>
  );
}

/** Markdown editor with a live preview (side by side on wide screens, tabs on phones). */
export function MarkdownField({
  name,
  label,
  defaultValue = "",
  hint,
  rows = 10,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  rows?: number;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <div className="flex rounded-lg border border-border-strong p-0.5 lg:hidden" role="tablist">
          {(["write", "preview"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`min-h-9 rounded-md px-3 text-xs font-semibold ${tab === k ? "bg-accent text-accent-fg" : ""}`}
            >
              {k === "write" ? t.write : t.preview}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={`${id}-h`}
          className={`input min-h-40 py-2 font-mono text-sm leading-relaxed ${tab === "preview" ? "hidden lg:block" : ""}`}
        />
        <div
          className={`min-h-40 overflow-auto rounded-lg border border-border bg-bg p-3 text-sm ${tab === "write" ? "hidden lg:block" : ""}`}
          aria-label={t.preview}
        >
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-muted">{t.previewEmpty}</p>}
        </div>
      </div>
      <p id={`${id}-h`} className="mt-1 text-xs text-muted">
        {hint ?? t.markdownHint}
      </p>
    </div>
  );
}

/** Cover image: upload to Supabase Storage ("covers" bucket) or paste a URL. */
export function CoverField({ defaultValue = "" }: { defaultValue?: string | null }) {
  const id = useId();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(uz.admin.errors.uploadFailed);
      return;
    }
    setUploading(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage.from("covers").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);
    if (upErr) {
      setError(uz.admin.errors.uploadFailed);
      return;
    }
    setUrl(supabase.storage.from("covers").getPublicUrl(path).data.publicUrl);
  }

  return (
    <fieldset>
      <legend className="label">{t.cover}</legend>
      <input type="hidden" name="cover_url" value={url} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex aspect-video w-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
          {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImageUp className="size-8 text-muted" aria-hidden="true" />}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn-secondary cursor-pointer">
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImageUp className="size-4" aria-hidden="true" />}
            {uploading ? t.coverUploading : t.coverUpload}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
          {url ? (
            <button type="button" className="btn-ghost justify-start text-sm" onClick={() => setUrl("")}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.coverRemove}
            </button>
          ) : null}
          <p className="text-xs text-muted">{t.coverHint}</p>
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor={id} className="text-xs font-semibold text-muted">
          {t.coverUrl}
        </label>
        <input id={id} className="input mt-1 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
      </div>
      {error ? (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </fieldset>
  );
}

/** YouTube link with validation and a live preview. */
export function YouTubeField({ defaultValue = "" }: { defaultValue?: string | null }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const vid = youtubeId(value);
  const invalid = value.trim() !== "" && !vid;
  return (
    <div>
      <label htmlFor={id} className="label">
        {uz.admin.lesson.youtube}
      </label>
      <input
        id={id}
        name="youtube_url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=..."
        aria-invalid={invalid}
        aria-describedby={`${id}-h`}
        className="input"
      />
      <p id={`${id}-h`} className={`mt-1 text-xs ${invalid ? "font-semibold text-danger" : "text-muted"}`}>
        {invalid ? uz.admin.errors.youtubeInvalid : vid ? uz.admin.lesson.youtubeOk : uz.admin.lesson.youtubeHint}
      </p>
      {vid ? (
        <div className="mt-3 aspect-video max-w-md overflow-hidden rounded-lg border border-border bg-black">
          <iframe src={youtubeEmbedUrl(vid)} title={uz.lesson.video} className="size-full" allowFullScreen loading="lazy" />
        </div>
      ) : null}
    </div>
  );
}

/** "2026-11-01T09:00" in Tashkent time (UTC+5) for <input type="datetime-local">. */
function toTashkentInput(iso: string | null | undefined): string {
  return iso ? new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 16) : "";
}

/** Sale price ("aksiya") and its end time, for courses and bundles. */
export function SaleFields({ price, endsAt }: { price?: number | null; endsAt?: string | null }) {
  const id = useId();
  const s = uz.admin.sale;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="sale_price" label={s.price} defaultValue={price != null ? String(price) : ""} inputMode="numeric" hint={s.priceHint} />
      <div>
        <label htmlFor={id} className="label">
          {s.ends}
        </label>
        <input id={id} name="sale_ends_at" type="datetime-local" className="input" defaultValue={toTashkentInput(endsAt)} aria-describedby={`${id}-h`} />
        <p id={`${id}-h`} className="mt-1 text-xs text-muted">
          {s.endsHint}
        </p>
      </div>
    </div>
  );
}
