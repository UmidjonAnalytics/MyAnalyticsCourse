import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BarChart3, BookOpen, Briefcase, Check, CheckCircle2, Clock, Layers, PartyPopper } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Markdown } from "@/components/Markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { getPath } from "@/lib/data/paths";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

type Params = Promise<{ slug: string }>;
const t = uz.paths;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPath(slug, (await getCurrentUser())?.id ?? null);
  return data ? { title: data.path.title, description: data.path.short_description } : {};
}

export default async function PathPage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const data = await getPath(slug, user?.id ?? null);
  if (!data) notFound();
  const { path, bundle, steps, projects } = data;

  const lessons = steps.reduce((a, s) => a + s.outline.total, 0);
  const minutes = steps.reduce((a, s) => a + s.outline.lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0), 0);
  const separately = steps.reduce((a, s) => a + s.outline.course.price, 0);
  const isDone = (s: (typeof steps)[number]) => s.outline.total > 0 && s.outline.completed === s.outline.total;
  const doneCount = steps.filter(isDone).length;
  const ownsAll = steps.length > 0 && steps.every((s) => s.outline.hasAccess);
  const current = steps.find((s) => !isDone(s)) ?? null;
  const currentHref = current
    ? current.outline.hasAccess && current.outline.next
      ? `/dars/${current.outline.course.slug}/${current.outline.next.slug}`
      : `/kurs/${current.outline.course.slug}`
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/yollar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.back}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.title}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{path.title}</h1>
            <p className="mt-3 text-lg text-muted">{path.short_description}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {path.level ? (
                <li className="inline-flex items-center gap-1.5">
                  <BarChart3 className="size-4" aria-hidden="true" />
                  {uz.coursePage.levels[path.level]}
                </li>
              ) : null}
              <li className="inline-flex items-center gap-1.5">
                <Layers className="size-4" aria-hidden="true" />
                {t.courses(steps.length)}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {t.lessons(lessons)}
              </li>
              {minutes > 0 ? (
                <li className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {t.hours(minutes)}
                </li>
              ) : null}
              {projects.length > 0 ? (
                <li className="inline-flex items-center gap-1.5">
                  <Briefcase className="size-4" aria-hidden="true" />
                  {t.projects(projects.length)}
                </li>
              ) : null}
            </ul>
          </header>

          {path.outcomes.length > 0 ? (
            <section aria-labelledby="path-outcomes" className="card p-5 sm:p-6">
              <h2 id="path-outcomes" className="text-xl font-bold">
                {t.outcomes}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {path.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {path.description ? <Markdown>{path.description}</Markdown> : null}

          <section aria-labelledby="path-steps">
            <h2 id="path-steps" className="text-xl font-bold">
              {t.steps}
            </h2>
            <ol className="mt-5">
              {steps.map((s, i) => {
                const o = s.outline;
                const done = isDone(s);
                const isCurrent = current === s;
                const stepMinutes = o.lessons.reduce((m, l) => m + (l.duration_minutes ?? 0), 0);
                const courseProjects = projects.filter((p) => p.course_id === o.course.id);
                return (
                  <li key={o.course.id} className="relative flex gap-4 pb-8 last:pb-0">
                    {/* timeline */}
                    <div className="flex flex-col items-center" aria-hidden="true">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                          done
                            ? "border-accent bg-accent text-accent-fg"
                            : isCurrent
                              ? "border-accent bg-surface text-accent-text"
                              : "border-border-strong bg-surface text-muted"
                        }`}
                      >
                        {done ? <Check className="size-4" /> : i + 1}
                      </span>
                      {i < steps.length - 1 ? <span className={`mt-1 w-0.5 flex-1 ${done ? "bg-accent" : "bg-border"}`} /> : null}
                    </div>
                    <div className={`card min-w-0 flex-1 p-5 ${isCurrent ? "border-accent" : ""}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {t.step(i + 1)}
                        {done ? <span className="ml-2 normal-case text-accent-text">· {t.done}</span> : null}
                      </p>
                      <h3 className="mt-1 text-lg font-bold">
                        <Link href={`/kurs/${o.course.slug}`} className="hover:underline">
                          {o.course.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-muted">{o.course.short_description}</p>
                      <p className="mt-2 text-sm text-muted">
                        {t.lessons(o.total)}
                        {stepMinutes > 0 ? ` · ${t.hours(stepMinutes)}` : ""}
                      </p>
                      {o.hasAccess ? (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted">
                            <span>{uz.course.progress(o.completed, o.total)}</span>
                            <span>{o.percent}%</span>
                          </div>
                          <div
                            className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"
                            role="progressbar"
                            aria-valuenow={o.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${o.course.title}: ${uz.lesson.progressLabel}`}
                          >
                            <div className="h-full rounded-full bg-accent" style={{ width: `${o.percent}%` }} />
                          </div>
                        </div>
                      ) : null}
                      {courseProjects.length > 0 ? (
                        <ul className="mt-3 space-y-1">
                          {courseProjects.map((p) => (
                            <li key={p.id}>
                              <Link href={`/loyiha/${p.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
                                <Briefcase className="size-4" aria-hidden="true" />
                                {p.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {s.certificateCode ? (
                          <Link href={`/sertifikat/${s.certificateCode}`} className="btn-secondary min-h-10 text-sm">
                            <Award className="size-4" aria-hidden="true" />
                            {t.certificate}
                          </Link>
                        ) : null}
                        {isCurrent && currentHref ? (
                          <Link href={currentHref} className="btn-primary min-h-10 text-sm">
                            {o.completed > 0 ? t.continue : t.start}
                          </Link>
                        ) : !done ? (
                          <Link href={`/kurs/${o.course.slug}`} className="btn-ghost min-h-10 text-sm">
                            {t.openCourse}
                          </Link>
                        ) : null}
                        {o.hasAccess && !done ? <span className="text-xs font-semibold text-accent-text">{t.owned}</span> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <CourseCover url={path.cover_url} label={path.title} />
            <div className="space-y-4 p-5">
              {user && steps.some((s) => s.outline.hasAccess) ? (
                <div>
                  <p className="text-sm font-semibold">{t.progress(doneCount, steps.length)}</p>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${steps.length ? Math.round((doneCount / steps.length) * 100) : 0}%` }} />
                  </div>
                </div>
              ) : null}
              {doneCount === steps.length && steps.length > 0 ? (
                <p className="flex items-start gap-2 rounded-lg bg-accent-soft p-3 text-sm font-semibold">
                  <PartyPopper className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  {t.allDone}
                </p>
              ) : currentHref && user && current?.outline.hasAccess ? (
                <Link href={currentHref} className="btn-primary w-full">
                  {t.continue}: {current.outline.course.title}
                </Link>
              ) : null}
              {bundle && !ownsAll ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="font-display text-3xl font-bold">{formatSom(bundle.price)}</p>
                  {separately > bundle.price ? (
                    <p className="text-sm text-muted">
                      {t.separately}: <s>{formatSom(separately)}</s>
                    </p>
                  ) : null}
                  <p className="text-sm text-muted">{t.buyAllNote}</p>
                  <Link href={`/tolov/toplam/${bundle.slug}`} className="btn-primary w-full">
                    {t.buyAll}
                  </Link>
                </div>
              ) : null}
              <ul className="space-y-2 border-t border-border pt-4 text-sm">
                {steps.map((s, i) => (
                  <li key={s.outline.course.id} className="flex items-center gap-2">
                    {isDone(s) ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent-text" aria-label={t.done} />
                    ) : (
                      <span className="w-4 shrink-0 text-center text-xs font-bold text-muted">{i + 1}</span>
                    )}
                    <span className="min-w-0 flex-1">{s.outline.course.title}</span>
                    {s.outline.hasAccess ? <span className="text-xs text-accent-text">{t.owned}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
