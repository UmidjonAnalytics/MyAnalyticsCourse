import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.exercises.title };

export default async function Exercises() {
  const supabase = await createClient();
  const [{ data }, { data: keys }] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, title, is_published, lessons(title, courses(title)), exercise_submissions(count)")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("exercise_keys").select("exercise_id, expected"),
  ]);
  const ready = new Set((keys ?? []).filter((k) => k.expected).map((k) => k.exercise_id));
  const t = uz.admin.exercises;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((x) => (
          <li key={x.id}>
            <Link href={`/mashqlar/${x.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              {ready.has(x.id) ? (
                <CheckCircle2 className="size-5 text-accent-text" aria-label={t.expected} />
              ) : (
                <CircleDashed className="size-5 text-muted" aria-label={t.expectedNone} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{x.title}</span>
                <span className="text-xs text-muted">
                  {x.lessons?.courses?.title} · {x.lessons?.title}
                </span>
              </span>
              <span className={`text-xs font-semibold ${x.is_published ? "text-accent-text" : "text-muted"}`}>
                {x.is_published ? uz.admin.common.published : uz.admin.common.draft}
              </span>
              <span className="text-xs text-muted">{t.submissions(x.exercise_submissions[0]?.count ?? 0)}</span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
