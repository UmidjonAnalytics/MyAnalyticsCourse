import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Award, BookOpenText, ChevronLeft, ChevronRight, ClipboardList, Clock, Code2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { CertificateButton } from "@/components/course/CertificateButton";
import { AssignmentsList, loadAssignments, loadMaterials, MaterialsList } from "@/components/learn/Blocks";
import { Discussion } from "@/components/learn/Discussion";
import { LessonActions } from "@/components/learn/LessonActions";
import { LessonTabs, type LessonTab } from "@/components/learn/LessonTabs";
import { QuizPanel } from "@/components/learn/QuizPanel";
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
  return { user, outline, index, lesson: outline.lessons[index]! };
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
  const { user, outline, index, lesson } = data;
  if (!user) redirect(`/kirish?sabab=kerak&next=${encodeURIComponent(`/dars/${course}/${lessonSlug}`)}`);
  if (lesson.state === "locked") redirect(`/ruxsat-yoq?kurs=${encodeURIComponent(course)}`);

  const supabase = await createClient();
  // RLS returns only published items of lessons this student can open.
  const [{ data: content }, { data: exercises }, excel, { data: comments }, materials] = await Promise.all([
    supabase.from("lesson_contents").select("youtube_url, content_md, task_md").eq("lesson_id", lesson.id).maybeSingle(),
    supabase
      .from("exercises")
      .select("id, title, task_md, points, exercise_datasets(datasets(id, name, table_name, row_count, columns))")
      .eq("lesson_id", lesson.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    loadAssignments(supabase, { lessonId: lesson.id }, user.id),
    supabase.rpc("lesson_comments_list", { p_lesson_id: lesson.id }),
    loadMaterials(supabase, { lessonId: lesson.id }),
  ]);
  const [{ data: quizQuestions }, { data: quizAttempts }, { data: lessonRow }] = await Promise.all([
    supabase.from("quiz_questions").select("id, prompt, options, multiple").eq("lesson_id", lesson.id).order("position"),
    supabase
      .from("quiz_attempts")
      .select("id, correct, total, passed, created_at")
      .eq("lesson_id", lesson.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("lessons").select("quiz_pass_percent").eq("id", lesson.id).single(),
  ]);
  const hasQuiz = (quizQuestions?.length ?? 0) > 0;
  const courseDone = outline.total > 0 && outline.completed === outline.total;
  const { data: cert } = courseDone
    ? await supabase.from("certificates").select("code").eq("course_id", outline.course.id).eq("user_id", user.id).is("revoked_at", null).maybeSingle()
    : { data: null };

  const exerciseIds = (exercises ?? []).map((x) => x.id);
  const { data: submissions } =
    exerciseIds.length > 0
      ? await supabase
          .from("exercise_submissions")
          .select("id, exercise_id, sql, passed, created_at")
          .eq("user_id", user.id)
          .in("exercise_id", exerciseIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

  const next = outline.lessons.slice(index + 1).find((l) => l.state !== "locked") ?? null;
  const prev = outline.lessons.slice(0, index).reverse().find((l) => l.state !== "locked") ?? null;
  const href = (slug: string) => `/dars/${outline.course.slug}/${slug}`;
  const videoId = youtubeId(content?.youtube_url);
  const commentList = comments ?? [];
  const practiceCount = (exercises?.length ?? 0) + excel.assignments.length;

  const description = (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-border bg-black">
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
        <section aria-labelledby="lesson-text">
          <h2 id="lesson-text" className="flex items-center gap-2 text-lg font-bold">
            <BookOpenText className="size-5 text-accent-text" aria-hidden="true" />
            {uz.lesson.text}
          </h2>
          <Markdown className="mt-3">{content.content_md}</Markdown>
        </section>
      ) : null}

      <MaterialsList {...materials} />

      {content?.task_md ? (
        <section className="rounded-xl border-l-4 border-accent bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="task">
          <h2 id="task" className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-5 text-accent-text" aria-hidden="true" />
            {uz.lesson.task}
          </h2>
          <Markdown className="mt-3">{content.task_md}</Markdown>
        </section>
      ) : null}
    </div>
  );

  const practice = (
    <div className="space-y-10">
      <AssignmentsList {...excel} />

      {exercises && exercises.length > 0 ? (
        <section aria-labelledby="sql-practice">
          <h2 id="sql-practice" className="flex items-center gap-2 text-xl font-bold">
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
    </div>
  );

  const tabs: LessonTab[] = [
    { id: "tavsif", label: uz.tabs.description, content: description },
    ...(practiceCount > 0 ? [{ id: "amaliyot", label: uz.tabs.practice, count: practiceCount, content: practice }] : []),
    ...(hasQuiz
      ? [
          {
            id: "test",
            label: uz.quiz.tab,
            count: quizQuestions!.length,
            content: (
              <QuizPanel
                lessonId={lesson.id}
                courseSlug={outline.course.slug}
                passPercent={lessonRow?.quiz_pass_percent ?? 70}
                questions={quizQuestions!}
                attempts={quizAttempts ?? []}
              />
            ),
          },
        ]
      : []),
    {
      id: "muhokama",
      label: uz.tabs.discussion,
      count: commentList.filter((c) => !c.deleted).length,
      content: (
        <Discussion
          lessonId={lesson.id}
          courseSlug={outline.course.slug}
          comments={commentList}
          currentUserId={user.id}
          isAdmin={user.profile?.role === "admin"}
        />
      ),
    },
  ];

  return (
    <article className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-accent-text">
            <span>{uz.lesson.lessonOf(lesson.number, outline.total)}</span>
            {lesson.duration_minutes ? (
              <span className="inline-flex items-center gap-1 font-normal text-muted">
                <Clock className="size-4" aria-hidden="true" />
                {uz.topbar.minutes(lesson.duration_minutes)}
              </span>
            ) : null}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
        </div>
        <LessonActions
          lessonId={lesson.id}
          courseSlug={outline.course.slug}
          completed={lesson.status === "completed"}
          nextHref={next ? href(next.slug) : null}
          quizRequired={hasQuiz}
        />
      </header>

      {/* After the certificate is claimed, the banner stays only on the last lesson so it doesn't push videos down. */}
      {courseDone && (!cert || index === outline.lessons.length - 1) ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent bg-accent-soft p-4 sm:p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Award className="size-5 text-accent-text" aria-hidden="true" />
            {uz.certificate.courseDone}
          </p>
          {cert ? (
            <Link href={`/sertifikat/${cert.code}`} className="btn-primary">
              {uz.certificate.view}
            </Link>
          ) : (
            <div className="w-full sm:w-auto">
              <CertificateButton courseId={outline.course.id} className="btn-primary w-full sm:w-auto" />
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6">
        <LessonTabs key={lesson.id} tabs={tabs} />
      </div>

      <nav aria-label={uz.topbar.lessonNav} className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
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
      </nav>
    </article>
  );
}
