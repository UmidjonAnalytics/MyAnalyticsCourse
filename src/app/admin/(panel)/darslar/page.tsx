import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.curriculum.title };

// "Modullar va darslar": choose a course first.
export default async function PickCourse() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, modules(count), lessons(count)")
    .is("archived_at", null)
    .order("position");
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{uz.admin.curriculum.title}</h1>
      <p className="mt-1 text-muted">{uz.admin.curriculum.pickCourse}</p>
      <ul className="card mt-6 divide-y divide-border">
        {(courses ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/kurslar/${c.id}/darslar`} className="flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-surface-muted">
              <span className="flex-1 font-semibold">{c.title}</span>
              <span className="text-sm text-muted">
                {uz.course.modulesCount(c.modules[0]?.count ?? 0)} · {uz.course.lessonsCount(c.lessons[0]?.count ?? 0)}
              </span>
              <ChevronRight className="size-4 text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
        {!courses?.length ? <li className="p-5 text-muted">{uz.admin.common.empty}</li> : null}
      </ul>
    </div>
  );
}
