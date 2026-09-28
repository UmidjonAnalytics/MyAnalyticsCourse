import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpenText, ChevronLeft, ChevronRight, ClipboardList, Code2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { LessonActions } from "@/components/learn/LessonActions";
import { ExercisePanel, type PanelDataset } from "@/components/practice/ExercisePanel";
import { getCurrentUser } from "@/lib/auth/session";
import { getCourseOutline } from "@/lib/data/catalog";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { youtubeEmbedUrl, youtubeId } from "@/lib/youtube";

type Params = Promise<{ course: string; lesson: string }>;

async function load(courseSlug: string, lessonSlug: string) {
  const user = await getCurrentUser();
  const outline = await getCourseOutline(courseSlug, user?.id ?? null);
  if (!outline) return null;
  const index = outline.lessons.findIndex((l) => l.slug === lessonSlug);
  if (index < 0) return null;
  return { outline, index, lesson: outline.lessons[index]! };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { course, lesson } = await params;
  const data = await load(course, lesson);
  return data ? { title: `${data.lesson.title} · ${data.outline.course.title}` } : {};
}

export default async function LessonPage({ params }: { params: Params }) {
  const { course, lesson: lessonSlug } = await params;
  const data = await load(course, lessonSlug);
  if (!data) notFound();
  const { outline, index, lesson } = data;
  if (lesson.state === "locked") redirect(`/ruxsat-yoq?kurs=${encodeURIComponent(course)}`);

  const supabase = await createClient();
  const [{ data: content }, { data: exercises }, { data: claims }] = await Promise.all([
    supabase.from("lesson_contents").select("youtube_url, content_md, task_md").eq("lesson_id", lesson.id).maybeSingle(),
    // RLS returns only published exercises of lessons this student can open.
    supabase
      .from("exercises")
      .select("id, title, task_md, points, exercise_datasets(datasets(id, name, table_name, row_count, columns))")
      .eq("lesson_id", lesson.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    supabase.auth.getClaims(),
  ]);
  const exerciseIds = (exercises ?? []).map((x) => x.id);
  const { data: submissions } =
    exerciseIds.length > 0 && claims?.claims?.sub
      ? await supabase
          .from("exercise_submissions")
          .select("id, exercise_id, sql, passed, created_at")
          .eq("user_id", claims.claims.sub)
          .in("exercise_id", exerciseIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

  const currentModule = outline.modules.find((m) => m.lessons.some((l) => l.id === lesson.id));
  const prev = outline.lessons.slice(0, index).reverse().find((l) => l.state !== "locked") ?? null;
  const next = outline.lessons.slice(index + 1).find((l) => l.state !== "locked") ?? null;
  const href = (slug: string) => `/dars/${outline.course.slug}/${slug}`;
  const videoId = youtubeId(content?.youtube_url);

  return (
    <article className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={`/kurs/${outline.course.slug}`} className="hover:text-text hover:underline">
              {outline.course.title}
            </Link>
          </li>
          {currentModule ? (
            <>
              <li aria-hidden="true">/</li>
              <li>{currentModule.title}</li>
            </>
          ) : null}
        </ol>
      </nav>

      <p className="mt-3 text-sm font-semibold text-accent-text">{uz.lesson.lessonOf(lesson.number, outline.total)}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{lesson.title}</h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-black">
        {videoId ? (
          <div className="relative aspect-video">
            <iframe
              src={youtubeEmbedUrl(videoId)}
              title={`${uz.lesson.video}: ${lesson.title}`}
              className="absolute inset-0 size-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-surface-muted text-muted">{uz.lesson.noVideo}</div>
        )}
      </div>

      {content?.content_md ? (
        <section className="mt-8" aria-labelledby="lesson-text">
          <h2 id="lesson-text" className="flex items-center gap-2 text-lg font-bold">
            <BookOpenText className="size-5 text-accent-text" aria-hidden="true" />
            {uz.lesson.text}
          </h2>
          <Markdown className="mt-3">{content.content_md}</Markdown>
        </section>
      ) : null}

      {content?.task_md ? (
        <section className="mt-8 rounded-xl border-l-4 border-accent bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="task">
          <h2 id="task" className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-5 text-accent-text" aria-hidden="true" />
            {uz.lesson.task}
          </h2>
          <Markdown className="mt-3">{content.task_md}</Markdown>
        </section>
      ) : null}

      {exercises && exercises.length > 0 ? (
        <section className="mt-10" aria-labelledby="practice">
          <h2 id="practice" className="flex items-center gap-2 text-xl font-bold">
            <Code2 className="size-5 text-accent-text" aria-hidden="true" />
            {uz.practice.title}
          </h2>
          <div className="mt-4 space-y-6">
            {exercises.map((x, i) => (
              <ExercisePanel
                key={x.id}
                exerciseId={x.id}
                number={i + 1}
                title={x.title}
                points={x.points}
                task={x.task_md ? <Markdown>{x.task_md}</Markdown> : null}
                datasets={x.exercise_datasets
                  .map((ed) => ed.datasets)
                  .filter(Boolean)
                  .map((d) => ({ ...d, columns: (d.columns ?? []) as PanelDataset["columns"] }))}
                attempts={(submissions ?? [])
                  .filter((s) => s.exercise_id === x.id)
                  .map((s) => ({ id: s.id, sql: s.sql, passed: s.passed, created_at: s.created_at }))}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 border-t border-border pt-6">
        <LessonActions
          lessonId={lesson.id}
          courseSlug={outline.course.slug}
          completed={lesson.status === "completed"}
          nextHref={next ? href(next.slug) : null}
        />
        <div className="mt-6 flex items-center justify-between gap-3">
          {prev ? (
            <Link href={href(prev.slug)} className="btn-secondary">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {uz.lesson.prev}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={href(next.slug)} className="btn-secondary">
              {uz.lesson.next}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link href={`/kurs/${outline.course.slug}`} className="btn-secondary">
              {uz.lesson.backToCourse}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
