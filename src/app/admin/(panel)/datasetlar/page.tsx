import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Table2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.datasets.title };

export default async function Datasets() {
  const supabase = await createClient();
  const { data } = await supabase.from("datasets").select("id, name, table_name, row_count, exercise_datasets(count)").order("table_name");
  const t = uz.admin.datasets;
  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/datasetlar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.new}
        </Link>
      </div>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((d) => (
          <li key={d.id}>
            <Link href={`/datasetlar/${d.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              <Table2 className="size-5 text-accent-text" aria-hidden="true" />
              <span className="font-mono font-semibold">{d.table_name}</span>
              <span className="flex-1 text-sm text-muted">{d.name}</span>
              <span className="text-sm text-muted">{t.rows(d.row_count)}</span>
              <span className="text-sm text-muted">{uz.admin.exercises.title}: {d.exercise_datasets[0]?.count ?? 0}</span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{uz.admin.common.empty}</li> : null}
      </ul>
    </div>
  );
}
