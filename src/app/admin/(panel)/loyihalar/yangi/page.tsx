import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.projects.add };

export default async function NewProject() {
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("id, title").is("archived_at", null).order("position");
  return (
    <div className="max-w-4xl">
      <Link href="/loyihalar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.projects.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{uz.admin.projects.add}</h1>
      <ProjectForm courses={courses ?? []} />
    </div>
  );
}
