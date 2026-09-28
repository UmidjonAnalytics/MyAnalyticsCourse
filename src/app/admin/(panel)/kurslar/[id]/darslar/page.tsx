import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CurriculumEditor, type EditorModule } from "@/components/admin/CurriculumEditor";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.curriculum.title };

export default async function Curriculum({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("modules").select("id, title, is_published").eq("course_id", id).is("archived_at", null).order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, title, is_published, is_free_preview")
      .eq("course_id", id)
      .is("archived_at", null)
      .order("position"),
  ]);

  const editorModules: EditorModule[] = (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
  }));

  return (
    <div className="max-w-4xl">
      <Link href={`/kurslar/${course.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {course.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{uz.admin.curriculum.title}</h1>
      <p className="mb-6 mt-1 text-muted">{uz.admin.curriculum.lead}</p>
      <CurriculumEditor courseId={course.id} modules={editorModules} />
    </div>
  );
}
