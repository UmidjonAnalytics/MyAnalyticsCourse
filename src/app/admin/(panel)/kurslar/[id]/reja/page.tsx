import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OutlineImporter } from "@/components/admin/OutlineImporter";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.bulk.importTitle };

export default async function ImportOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();

  return (
    <div className="max-w-6xl">
      <Link
        href={`/kurslar/${course.id}/darslar`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {course.title}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{uz.admin.bulk.importTitle}</h1>
      <p className="mb-6 mt-1 text-muted">{uz.admin.bulk.importLead}</p>
      <OutlineImporter courseId={course.id} />
    </div>
  );
}
