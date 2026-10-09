"use client";

import { useDeferredValue, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, PlayCircle, Wand2 } from "lucide-react";
import { importOutline } from "@/app/admin/(panel)/actions/curriculum";
import { toast } from "@/components/admin/toast";
import { parseOutline } from "@/lib/admin/outline";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.bulk;

export function OutlineImporter({ courseId }: { courseId: string }) {
  const router = useRouter();
  const ids = useId();
  const [text, setText] = useState("");
  const [free, setFree] = useState("0");
  const [pending, startTransition] = useTransition();
  const outline = parseOutline(useDeferredValue(text));
  const freeCount = /^\d{1,3}$/.test(free) ? Number(free) : -1;
  const canCreate = outline.lessonCount > 0 && outline.problems.length === 0 && freeCount >= 0 && !pending;
  // Number of lessons before each module, to mark the first N lessons of the course as free in the preview.
  const before = outline.modules.map((_, i) => outline.modules.slice(0, i).reduce((a, m) => a + m.lessons.length, 0));

  const create = () =>
    startTransition(async () => {
      const res = await importOutline(courseId, text, freeCount);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? uz.admin.common.saved);
      router.push(`/kurslar/${courseId}/videolar`);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="card p-5 text-sm">
          <h2 className="font-bold">{t.howTitle}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>{t.howModule}</li>
            <li>{t.howLesson}</li>
            <li>{t.howExtras}</li>
            <li>{t.howDrafts}</li>
          </ul>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor={`${ids}text`} className="label mb-0">
              {t.outline}
            </label>
            {text.trim() === "" ? (
              <button type="button" className="btn-ghost text-sm" onClick={() => setText(t.exampleText)}>
                <Wand2 className="size-4" aria-hidden="true" />
                {t.example}
              </button>
            ) : null}
          </div>
          <textarea
            id={`${ids}text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            spellCheck={false}
            className="input mt-1.5 min-h-80 py-2 font-mono text-sm leading-6"
            placeholder={t.exampleText}
          />
        </div>

        <div>
          <label htmlFor={`${ids}free`} className="label">
            {t.freeCount}
          </label>
          <input
            id={`${ids}free`}
            value={free}
            onChange={(e) => setFree(e.target.value.trim())}
            inputMode="numeric"
            className="input w-28"
            aria-describedby={`${ids}freehint`}
            aria-invalid={freeCount < 0}
          />
          <p id={`${ids}freehint`} className="mt-1 text-xs text-muted">
            {t.freeCountHint}
          </p>
        </div>
      </div>

      <section aria-labelledby={`${ids}preview`} className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${ids}preview`} className="font-bold">
            {t.preview}
          </h2>
          {outline.lessonCount > 0 ? (
            <p className="text-sm text-muted" aria-live="polite">
              {t.summary(outline.modules.length, outline.lessonCount, outline.videoCount)}
            </p>
          ) : null}
        </div>

        {outline.problems.length > 0 ? (
          <div className="rounded-xl border border-danger bg-danger-soft p-4" role="alert">
            <h3 className="flex items-center gap-2 font-semibold text-danger">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t.problemsTitle}
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {outline.problems.slice(0, 12).map((p, i) => (
                <li key={i}>
                  {p.line > 0 ? <span className="font-semibold">{t.line(p.line)}: </span> : null}
                  {t.problem[p.kind]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="card max-h-[32rem] overflow-y-auto p-2">
          {outline.modules.length === 0 ? (
            <p className="p-4 text-sm text-muted">{t.previewEmpty}</p>
          ) : (
            <ol className="space-y-2">
              {outline.modules.map((m, mi) => (
                <li key={mi} className="rounded-lg border border-border">
                  <p className="flex items-center justify-between gap-2 bg-surface-muted px-3 py-2 font-semibold">
                    <span className="min-w-0">{m.title}</span>
                    <span className="shrink-0 text-xs font-normal text-muted">{t.lessonsIn(m.lessons.length)}</span>
                  </p>
                  <ol className="divide-y divide-border text-sm">
                    {m.lessons.map((l, li) => {
                      const lessonNo = before[mi]! + li + 1;
                      return (
                        <li key={l.line} className="flex items-center gap-2 px-3 py-2">
                          <span className="min-w-0 flex-1">{l.title}</span>
                          {lessonNo <= freeCount ? (
                            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{t.free}</span>
                          ) : null}
                          {l.youtube ? <PlayCircle className="size-4 text-accent-text" aria-label="YouTube" role="img" /> : null}
                          {l.minutes !== null ? (
                            <span className="w-14 text-right text-xs tabular-nums text-muted">{uz.topbar.minutes(l.minutes)}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </div>

        <button type="button" className="btn-primary w-full" disabled={!canCreate} onClick={create}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t.create(outline.lessonCount)}
        </button>
      </section>
    </div>
  );
}
