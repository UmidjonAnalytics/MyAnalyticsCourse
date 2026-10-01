import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PathForm } from "@/components/admin/PathForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.paths.add };

export default async function NewPath() {
  const supabase = await createClient();
  const [{ data: courses }, { data: bundles }] = await Promise.all([
    supabase.from("courses").select("id, title").is("archived_at", null).order("position"),
    supabase.from("bundles").select("id, title").is("archived_at", null).order("position"),
  ]);
  return (
    <div className="max-w-4xl">
      <Link href="/yollar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.paths.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{uz.admin.paths.add}</h1>
      <PathForm courses={courses ?? []} bundles={bundles ?? []} />
    </div>
  );
}
