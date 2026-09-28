import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddAssignmentButton } from "@/components/admin/AddAssignmentButton";
import { AddExerciseButton } from "@/components/admin/AddExerciseButton";
import { LessonForm } from "@/components/admin/LessonForm";
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

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="lesson-assignments">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lesson-assignments" className="text-lg font-bold">
            {uz.admin.assignments.inLesson}
          </h2>
          <AddAssignmentButton lessonId={lesson.id} />
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
