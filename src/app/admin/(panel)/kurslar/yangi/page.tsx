import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "@/components/admin/CourseForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.courses.new };

export default async function NewCourse() {
  const supabase = await createClient();
  const [{ data: categories }, { data: instructors }] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase.from("instructors").select("id, name").order("name"),
  ]);
  return (
    <div className="max-w-4xl">
      <Link href="/kurslar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.courses.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{uz.admin.courses.new}</h1>
      <CourseForm categories={categories ?? []} instructors={instructors ?? []} />
    </div>
  );
}
