import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LessonsBulkEditor, type BulkModule } from "@/components/admin/LessonsBulkEditor";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.bulk.videosTitle };

export default async function LessonVideosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("modules").select("id, title").eq("course_id", id).is("archived_at", null).order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, title, duration_minutes, is_free_preview, is_published, lesson_contents(youtube_url)")
      .eq("course_id", id)
      .is("archived_at", null)
      .order("position"),
  ]);

  const bulk: BulkModule[] = (modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        youtube: l.lesson_contents?.youtube_url ?? "",
        minutes: l.duration_minutes,
        free: l.is_free_preview,
        published: l.is_published,
      })),
  }));

  return (
    <div className="max-w-4xl">
      <Link
        href={`/kurslar/${course.id}/darslar`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {course.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{uz.admin.bulk.videosTitle}</h1>
      <p className="mb-6 mt-1 text-muted">{uz.admin.bulk.videosLead}</p>
      <LessonsBulkEditor courseId={course.id} modules={bulk} />
    </div>
  );
}
