import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Markdown } from "@/components/Markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { getBundlesForCourse, getCourseOutline, type OutlineLesson } from "@/lib/data/catalog";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const outline = await getCourseOutline(slug, (await getCurrentUser())?.id ?? null);
  return outline ? { title: outline.course.title, description: outline.course.short_description } : {};
}

function LessonIcon({ lesson }: { lesson: OutlineLesson }) {
  if (lesson.state === "locked") return <Lock className="size-4 text-muted" aria-label={uz.lesson.stateLocked} />;
  if (lesson.state === "completed") return <CheckCircle2 className="size-4 text-accent-text" aria-label={uz.lesson.stateCompleted} />;
  if (lesson.state === "current") return <PlayCircle className="size-4 text-accent-text" aria-label={uz.lesson.stateCurrent} />;
  return <Circle className="size-4 text-muted" aria-label={uz.lesson.stateOpen} />;
}

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const outline = await getCourseOutline(slug, user?.id ?? null);
  if (!outline) notFound();

  const { course, modules, hasAccess, owned, total, completed, percent, next } = outline;
  const bundles = await getBundlesForCourse(await createClient(), course.id);
  const lessonHref = (l: OutlineLesson) => `/dars/${course.slug}/${l.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/#kurslar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.course.back}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {course.categoryName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{course.categoryName}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{course.title}</h1>
          <p className="mt-3 text-lg text-muted">{course.short_description}</p>
          <p className="mt-3 text-sm text-muted">
            {uz.course.modulesCount(modules.length)} · {uz.course.lessonsCount(total)}
          </p>

          {course.description ? (
            <section className="mt-8" aria-labelledby="about">
              <h2 id="about" className="text-xl font-bold">
                {uz.course.about}
              </h2>
              <Markdown className="mt-3">{course.description}</Markdown>
            </section>
          ) : null}

          <section className="mt-8" aria-labelledby="syllabus">
            <h2 id="syllabus" className="text-xl font-bold">
              {uz.course.syllabus}
            </h2>
            {modules.length === 0 ? <p className="mt-3 text-muted">{uz.course.noLessons}</p> : null}
            <ol className="mt-4 space-y-4">
              {modules.map((m) => (
                <li key={m.id} className="card overflow-hidden">
                  <h3 className="border-b border-border bg-surface-muted px-5 py-3 font-bold">{m.title}</h3>
                  <ul className="divide-y divide-border">
                    {m.lessons.map((l) => {
                      const canOpen = l.state !== "locked";
                      const inner = (
                        <>
                          <LessonIcon lesson={l} />
                          <span className="flex-1">{l.title}</span>
                          {l.is_free_preview && !hasAccess ? (
                            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                              {uz.course.freePreview}
                            </span>
                          ) : null}
                        </>
                      );
                      return (
                        <li key={l.id}>
                          {canOpen ? (
                            <Link href={lessonHref(l)} className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-surface-muted">
                              {inner}
                            </Link>
                          ) : (
                            <div className="flex min-h-12 items-center gap-3 px-5 py-2 text-muted">{inner}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <CourseCover url={course.cover_url} label={course.categoryName ?? course.title} />
            <div className="space-y-4 p-5">
              {owned || hasAccess ? (
                <>
                  <p className="flex items-center gap-2 font-semibold text-accent-text">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    {uz.course.owned}
                  </p>
                  <div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>{uz.course.progress(completed, total)}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  {next ? (
                    <Link href={lessonHref(next)} className="btn-primary w-full">
                      {completed > 0 ? uz.course.continue : uz.course.start}
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-bold">{formatSom(course.price)}</p>
                  <p className="text-sm text-muted">{uz.course.oneTime}</p>
                  <Link href={`/tolov/kurs/${course.slug}`} className="btn-primary w-full">
                    {uz.course.buy}
                  </Link>
                  {!user && outline.lessons.some((l) => l.is_free_preview) ? (
                    <p className="text-sm text-muted">{uz.course.loginToWatch}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {bundles.length > 0 && !owned ? (
            <div className="card p-5">
              <h2 className="font-bold">{uz.course.inBundles}</h2>
              <p className="mt-1 text-sm text-muted">{uz.course.inBundlesLead}</p>
              <ul className="mt-3 space-y-3">
                {bundles.map((b) => (
                  <li key={b.id}>
                    <Link href={`/toplam/${b.slug}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-surface-muted">
                      <span className="font-semibold">{b.title}</span>
                      <span className="shrink-0 text-sm font-bold">{formatSom(b.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
