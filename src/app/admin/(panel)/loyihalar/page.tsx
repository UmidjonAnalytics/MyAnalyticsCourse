import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.projects.title };

export default async function AdminProjects() {
  const supabase = await createClient();
  const [{ data }, { data: pending }] = await Promise.all([
    supabase.from("projects").select("id, title, is_published, courses(title)").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("project_submissions").select("project_id").eq("status", "submitted"),
  ]);
  const pendingBy = new Map<string, number>();
  for (const s of pending ?? []) pendingBy.set(s.project_id, (pendingBy.get(s.project_id) ?? 0) + 1);
  const t = uz.admin.projects;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/loyihalar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.add}
        </Link>
      </div>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/loyihalar/${p.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              <Briefcase className="size-5 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.title}</span>
                <span className="text-xs text-muted">{p.courses?.title}</span>
              </span>
              {pendingBy.get(p.id) ? (
                <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold">{t.pending(pendingBy.get(p.id)!)}</span>
              ) : null}
              <span className={`text-xs font-semibold ${p.is_published ? "text-accent-text" : "text-muted"}`}>
                {p.is_published ? uz.admin.common.published : uz.admin.common.draft}
              </span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
