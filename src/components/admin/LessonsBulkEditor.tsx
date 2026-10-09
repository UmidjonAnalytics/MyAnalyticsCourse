"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { updateLessons, type LessonRow } from "@/app/admin/(panel)/actions/curriculum";
import { toast } from "@/components/admin/toast";
import { parseMinutes } from "@/lib/admin/outline";
import { uz } from "@/lib/i18n/uz";
import { youtubeId } from "@/lib/youtube";

const t = uz.admin.bulk;

export type BulkLesson = { id: string; title: string; youtube: string; minutes: number | null; free: boolean; published: boolean };
export type BulkModule = { id: string; title: string; lessons: BulkLesson[] };

type Row = { youtube: string; minutes: string; free: boolean; published: boolean };

const toRow = (l: BulkLesson): Row => ({
  youtube: l.youtube,
  minutes: l.minutes === null ? "" : String(l.minutes),
  free: l.free,
  published: l.published,
});
const same = (a: Row, b: Row) =>
  a.youtube.trim() === b.youtube.trim() && a.minutes.trim() === b.minutes.trim() && a.free === b.free && a.published === b.published;
const videoOk = (v: string) => v.trim() === "" || youtubeId(v) !== null;
const minutesOf = (v: string) => (v.trim() === "" ? null : parseMinutes(v));
const minutesOk = (v: string) => v.trim() === "" || (minutesOf(v) ?? 601) <= 600;

export function LessonsBulkEditor({ courseId, modules }: { courseId: string; modules: BulkModule[] }) {
  const ids = useId();
  const lessons = modules.flatMap((m) => m.lessons);
  const [saved, setSaved] = useState<Record<string, Row>>(() => Object.fromEntries(lessons.map((l) => [l.id, toRow(l)])));
  const [rows, setRows] = useState<Record<string, Row>>(saved);
  const [firstFree, setFirstFree] = useState("5");
  const [pending, startTransition] = useTransition();

  const changed = lessons.filter((l) => !same(rows[l.id]!, saved[l.id]!));
  const invalid = lessons.some((l) => !videoOk(rows[l.id]!.youtube) || !minutesOk(rows[l.id]!.minutes));
  const all = lessons.map((l) => rows[l.id]!);
  const withVideo = all.filter((r) => r.youtube.trim() && videoOk(r.youtube)).length;

  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed.length]);

  const set = (id: string, patch: Partial<Row>) => setRows((cur) => ({ ...cur, [id]: { ...cur[id]!, ...patch } }));

  const applyFirstFree = () => {
    const n = Number(firstFree);
    if (!Number.isInteger(n) || n < 0) return;
    setRows((cur) => Object.fromEntries(lessons.map((l, i) => [l.id, { ...cur[l.id]!, free: i < n }])));
  };
  const publishWithVideo = () =>
    setRows((cur) =>
      Object.fromEntries(
        lessons.map((l) => [l.id, cur[l.id]!.youtube.trim() && videoOk(cur[l.id]!.youtube) ? { ...cur[l.id]!, published: true } : cur[l.id]!]),
      ),
    );

  const save = () =>
    startTransition(async () => {
      const payload: LessonRow[] = changed.map((l) => {
        const r = rows[l.id]!;
        return { id: l.id, youtube: r.youtube.trim(), minutes: minutesOf(r.minutes), free: r.free, published: r.published };
      });
      const res = await updateLessons(courseId, payload);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? uz.admin.common.saved);
      // Show minutes the way they were understood ("12:30" -> "13").
      const normalized = Object.fromEntries(
        lessons.map((l) => {
          const r = rows[l.id]!;
          const m = minutesOf(r.minutes);
          return [l.id, { ...r, youtube: r.youtube.trim(), minutes: m === null ? "" : String(m) }];
        }),
      );
      setRows(normalized);
      setSaved(normalized);
    });

  if (lessons.length === 0) return <p className="card p-5 text-muted">{t.noLessons}</p>;

  return (
    <div>
      <div className="card flex flex-wrap items-end gap-x-6 gap-y-4 p-4">
        <p className="w-full text-sm text-muted">
          {t.stats(withVideo, lessons.length, all.filter((r) => r.free).length, all.filter((r) => r.published).length)}
        </p>
        <div>
          <label htmlFor={`${ids}first`} className="label">
            {t.firstFree}
          </label>
          <div className="flex gap-2">
            <input
              id={`${ids}first`}
              value={firstFree}
              onChange={(e) => setFirstFree(e.target.value.trim())}
              inputMode="numeric"
              className="input w-20"
            />
            <button type="button" className="btn-secondary" onClick={applyFirstFree} disabled={!/^\d{1,3}$/.test(firstFree)}>
              {t.firstFreeApply}
            </button>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={publishWithVideo} disabled={withVideo === 0}>
          {t.publishWithVideo}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {modules.map((m) => (
          <section key={m.id} aria-labelledby={`${ids}m${m.id}`} className="card overflow-hidden">
            <h2 id={`${ids}m${m.id}`} className="bg-surface-muted px-4 py-3 font-bold">
              {m.title}
            </h2>
            <div
              className="hidden gap-3 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_5rem_3.5rem_3.5rem]"
              aria-hidden="true"
            >
              <span>{t.colLesson}</span>
              <span>{t.colVideo}</span>
              <span>{t.colMinutes}</span>
              <span className="text-center">{t.colFree}</span>
              <span className="text-center">{t.colPublished}</span>
            </div>
            <ul className="divide-y divide-border">
              {m.lessons.map((l) => {
                const r = rows[l.id]!;
                const vOk = videoOk(r.youtube);
                const mOk = minutesOk(r.minutes);
                const dirty = !same(r, saved[l.id]!);
                return (
                  <li
                    key={l.id}
                    className={`grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_5rem_3.5rem_3.5rem] ${dirty ? "bg-accent-soft/40" : ""}`}
                  >
                    <div className="col-span-2 flex min-w-0 items-center gap-1 md:col-span-1">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={l.title}>
                        {l.title}
                      </span>
                      <Link href={`/darslar/${l.id}`} className="btn-ghost size-9 shrink-0 px-0" aria-label={`${t.openLesson}: ${l.title}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <div className="relative">
                        <input
                          value={r.youtube}
                          onChange={(e) => set(l.id, { youtube: e.target.value })}
                          aria-label={`${t.colVideo}: ${l.title}`}
                          aria-invalid={!vOk}
                          placeholder="https://youtu.be/..."
                          className={`input pr-9 text-sm ${vOk ? "" : "border-danger"}`}
                          inputMode="url"
                          spellCheck={false}
                        />
                        {r.youtube.trim() && vOk ? (
                          <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent-text" aria-hidden="true" />
                        ) : null}
                      </div>
                      {!vOk ? <p className="mt-1 text-xs text-danger">{t.problem.badVideo}</p> : null}
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-muted md:hidden" aria-hidden="true">
                        {t.colMinutes}
                      </span>
                      <input
                        value={r.minutes}
                        onChange={(e) => set(l.id, { minutes: e.target.value })}
                        aria-label={`${t.colMinutes}: ${l.title}`}
                        aria-invalid={!mOk}
                        placeholder="daq"
                        className={`input text-sm ${mOk ? "" : "border-danger"}`}
                      />
                    </div>
                    <div className="flex items-center gap-4 md:contents">
                      <label className="flex min-h-11 items-center justify-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-5 accent-[var(--accent)]"
                          checked={r.free}
                          onChange={(e) => set(l.id, { free: e.target.checked })}
                        />
                        <span className="md:sr-only">{t.colFree}</span>
                        <span className="sr-only">: {l.title}</span>
                      </label>
                      <label className="flex min-h-11 items-center justify-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-5 accent-[var(--accent)]"
                          checked={r.published}
                          onChange={(e) => set(l.id, { published: e.target.checked })}
                        />
                        <span className="md:sr-only">{t.colPublished}</span>
                        <span className="sr-only">: {l.title}</span>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Stays at the bottom of the screen while scrolling, inside the content column (toasts appear bottom-right). */}
      <div className="sticky bottom-0 z-20 mt-5 flex items-center gap-4 rounded-t-xl border border-b-0 border-border bg-surface px-4 py-3 shadow-[0_-4px_16px_rgb(0_0_0/0.06)]">
        <button type="button" className="btn-primary" disabled={pending || changed.length === 0 || invalid} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {t.save}
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {t.changes(changed.length)}
        </p>
      </div>
    </div>
  );
}
