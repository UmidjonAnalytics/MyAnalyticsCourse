import type { Metadata } from "next";
import Link from "next/link";
import { Database, Plus } from "lucide-react";
import { SampleContentButton } from "@/components/admin/SampleContentButton";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.openData.title };

export default async function AdminOpenData() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_datasets")
    .select("id, title, industry, is_published, download_count")
    .is("archived_at", null)
    .order("position");
  const t = uz.admin.openData;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/ochiq-datasetlar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.add}
        </Link>
      </div>
      <SampleContentButton />
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((d) => (
          <li key={d.id}>
            <Link href={`/ochiq-datasetlar/${d.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              <Database className="size-5 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{d.title}</span>
                <span className="text-xs text-muted">{d.industry}</span>
              </span>
              <span className="text-xs text-muted">{t.downloads(d.download_count)}</span>
              <span className={`text-xs font-semibold ${d.is_published ? "text-accent-text" : "text-muted"}`}>
                {d.is_published ? uz.admin.common.published : uz.admin.common.draft}
              </span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
