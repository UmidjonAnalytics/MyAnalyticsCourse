import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deletePath } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PathForm } from "@/components/admin/PathForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.paths.edit };

export default async function EditPath({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: path }, { data: links }, { data: courses }, { data: bundles }] = await Promise.all([
    supabase.from("learning_paths").select("*").eq("id", id).maybeSingle(),
    supabase.from("learning_path_courses").select("course_id, position").eq("path_id", id).order("position"),
    supabase.from("courses").select("id, title").is("archived_at", null).order("position"),
    supabase.from("bundles").select("id, title").is("archived_at", null).order("position"),
  ]);
  if (!path) notFound();
  const t = uz.admin.paths;
  return (
    <div className="max-w-4xl">
      <Link href="/yollar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{path.title}</h1>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deletePath.bind(null, path.id)} className="btn-danger" danger />
      </div>
      <PathForm path={path} courseIds={(links ?? []).map((l) => l.course_id)} courses={courses ?? []} bundles={bundles ?? []} />
    </div>
  );
}
