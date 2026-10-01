import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddAssignmentButton } from "@/components/admin/AddAssignmentButton";
import { AddExerciseButton } from "@/components/admin/AddExerciseButton";
import { LessonForm } from "@/components/admin/LessonForm";
import { QuizEditor, type EditorQuizQuestion } from "@/components/admin/QuizEditor";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.lesson.edit };

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) notFound();

  const [{ data: content }, { data: modules }, { data: course }, { data: exercises }, { data: assignments }] = await Promise.all([
    supabase.from("lesson_contents").select("*").eq("lesson_id", id).maybeSingle(),
    supabase.from("modules").select("id, title").eq("course_id", lesson.course_id).is("archived_at", null).order("position"),
    supabase.from("courses").select("title").eq("id", lesson.course_id).single(),
    supabase.from("exercises").select("id, title, is_published").eq("lesson_id", id).is("archived_at", null).order("position"),
    supabase.from("assignments").select("id, title, is_published").eq("lesson_id", id).is("archived_at", null).order("position"),
  ]);
  const [{ data: quiz }, { count: quizAttempts }, { data: resources }] = await Promise.all([
    supabase
      .from("quiz_questions")
      .select("id, prompt, options, multiple, quiz_answer_keys(correct, explanation)")
      .eq("lesson_id", id)
      .order("position"),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("lesson_id", id),
    supabase.from("lesson_resources").select("id, title, file_path, url, size_bytes").eq("lesson_id", id).order("position"),
  ]);
  const quizQuestions: EditorQuizQuestion[] = (quiz ?? []).map((q) => {
    const key = Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys;
    return {
      id: q.id,
      key: q.id,
      prompt: q.prompt,
      options: q.options,
      multiple: q.multiple,
      correct: key?.correct ?? [],
      explanation: key?.explanation ?? "",
    };
  });

  return (
    <div className="max-w-5xl">
      <Link
        href={`/kurslar/${lesson.course_id}/darslar`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.lesson.toCurriculum}
      </Link>
      <p className="mt-2 text-sm text-muted">{course?.title}</p>
      <h1 className="mb-6 text-2xl font-bold">{lesson.title}</h1>
      <LessonForm lesson={lesson} content={content} modules={modules ?? []} />

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="lesson-exercises">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lesson-exercises" className="text-lg font-bold">
            {uz.admin.exercises.inLesson}
          </h2>
          <AddExerciseButton lessonId={lesson.id} />
        </div>
        {exercises?.length ? (
          <ul className="mt-3 divide-y divide-border">
            {exercises.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/mashqlar/${x.id}`} className="font-semibold hover:underline">
                  {x.title}
                </Link>
                <span className={`text-xs font-semibold ${x.is_published ? "text-accent-text" : "text-muted"}`}>
                  {x.is_published ? uz.admin.common.published : uz.admin.common.draft}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{uz.admin.exercises.empty}</p>
        )}
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="lesson-resources">
        <h2 id="lesson-resources" className="mb-3 text-lg font-bold">
          {uz.admin.resources.title}
        </h2>
        <ResourceManager owner={{ lessonId: lesson.id }} resources={resources ?? []} />
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="lesson-quiz">
        <h2 id="lesson-quiz" className="text-lg font-bold">
          {uz.admin.quiz.title}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">{uz.admin.quiz.lead}</p>
        <QuizEditor lessonId={lesson.id} passPercent={lesson.quiz_pass_percent} questions={quizQuestions} attempts={quizAttempts ?? 0} />
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="lesson-assignments">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lesson-assignments" className="text-lg font-bold">
            {uz.admin.assignments.inLesson}
          </h2>
          <AddAssignmentButton owner={{ lessonId: lesson.id }} />
        </div>
        {assignments?.length ? (
          <ul className="mt-3 divide-y divide-border">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/topshiriqlar/${a.id}`} className="font-semibold hover:underline">
                  {a.title}
                </Link>
                <span className={`text-xs font-semibold ${a.is_published ? "text-accent-text" : "text-muted"}`}>
                  {a.is_published ? uz.admin.common.published : uz.admin.common.draft}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{uz.admin.assignments.empty}</p>
        )}
      </section>
    </div>
  );
}
