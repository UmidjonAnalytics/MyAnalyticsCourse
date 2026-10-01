import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Route } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.paths.title };

export default async function AdminPaths() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_paths")
    .select("id, title, is_published, learning_path_courses(count)")
    .is("archived_at", null)
    .order("position");
  const t = uz.admin.paths;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/yollar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.add}
        </Link>
      </div>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/yollar/${p.id}`} className="flex min-h-14 items-center gap-4 px-5 py-3 hover:bg-surface-muted">
              <Route className="size-5 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-semibold">{p.title}</span>
              <span className="text-xs text-muted">{uz.paths.courses(p.learning_path_courses[0]?.count ?? 0)}</span>
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
