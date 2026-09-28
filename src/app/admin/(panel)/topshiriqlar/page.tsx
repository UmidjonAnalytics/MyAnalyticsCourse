import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.assignments.title };

export default async function Assignments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, is_published, lessons(title, courses(title)), assignment_questions(count), assignment_submissions(count)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  const t = uz.admin.assignments;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((a) => (
          <li key={a.id}>
            <Link href={`/topshiriqlar/${a.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              <FileSpreadsheet className="size-5 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{a.title}</span>
                <span className="text-xs text-muted">
                  {a.lessons?.courses?.title} · {a.lessons?.title}
                </span>
              </span>
              <span className={`text-xs font-semibold ${a.is_published ? "text-accent-text" : "text-muted"}`}>
                {a.is_published ? uz.admin.common.published : uz.admin.common.draft}
              </span>
              <span className="text-xs text-muted">
                {t.questionCount(a.assignment_questions[0]?.count ?? 0)} · {t.submissions(a.assignment_submissions[0]?.count ?? 0)}
              </span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.emptyAll}</li> : null}
      </ul>
    </div>
  );
}
