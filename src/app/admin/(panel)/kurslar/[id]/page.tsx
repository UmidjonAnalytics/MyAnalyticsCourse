import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ListTree } from "lucide-react";
import { CourseForm } from "@/components/admin/CourseForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.courses.edit };

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: course }, { data: categories }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("position"),
  ]);
  if (!course) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/kurslar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.courses.title}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/kurslar/${course.id}/darslar`} className="btn-secondary">
            <ListTree className="size-4" aria-hidden="true" />
            {uz.admin.courses.curriculum}
          </Link>
        </div>
      </div>
      <CourseForm course={course} categories={categories ?? []} />
      <p className="mt-4 text-sm text-muted">
        <ExternalLink className="mr-1 inline size-3.5" aria-hidden="true" />
        {uz.admin.courses.view}: <span className="font-mono">/kurs/{course.slug}</span>
      </p>
    </div>
  );
}
