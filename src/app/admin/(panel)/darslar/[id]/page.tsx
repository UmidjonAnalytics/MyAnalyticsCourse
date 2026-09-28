import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LessonForm } from "@/components/admin/LessonForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.lesson.edit };

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) notFound();

  const [{ data: content }, { data: modules }, { data: course }] = await Promise.all([
    supabase.from("lesson_contents").select("*").eq("lesson_id", id).maybeSingle(),
    supabase.from("modules").select("id, title").eq("course_id", lesson.course_id).is("archived_at", null).order("position"),
    supabase.from("courses").select("title").eq("id", lesson.course_id).single(),
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
    </div>
  );
}
