"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { saveReview } from "@/app/(site)/kurs/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

const t = uz.reviews;

export function ReviewForm({
  courseId,
  courseSlug,
  initial,
}: {
  courseId: string;
  courseSlug: string;
  initial: { rating: number; body: string; hidden: boolean } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setMsg({ tone: "error", text: t.pickRating });
    startTransition(async () => {
      const res = await saveReview({ courseId, courseSlug, rating, body });
      setMsg(res.ok ? { tone: "success", text: t.saved } : { tone: "error", text: res.error });
      if (res.ok) router.refresh();
    });
  };

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h3 className="font-bold">{initial ? t.edit : t.write}</h3>
      {initial?.hidden ? <Notice>{t.hiddenNote}</Notice> : null}
      <fieldset>
        <legend className="label">{t.rating}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded p-1 focus-within:outline-2 focus-within:outline-accent" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star className={`pointer-events-none size-7 ${n <= shown ? "fill-star text-star" : "text-muted"}`} aria-hidden="true" />
              <span className="sr-only">{t.stars(n)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-body" className="label">
          {t.body}
        </label>
        <textarea
          id="review-body"
          className="input min-h-24 py-2"
          value={body}
          maxLength={2000}
          placeholder={t.bodyPlaceholder}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
