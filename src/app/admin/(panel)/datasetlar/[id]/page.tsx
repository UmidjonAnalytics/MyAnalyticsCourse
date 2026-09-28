import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteDataset } from "@/app/admin/(panel)/actions/practice";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DatasetUploader } from "@/components/admin/DatasetUploader";
import { ResultTable } from "@/components/practice/ResultTable";
import { uz } from "@/lib/i18n/uz";
import type { Cell } from "@/lib/practice/checker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.datasets.title };

// /datasetlar/yangi = upload form; /datasetlar/<id> = preview and usage.
export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = uz.admin.datasets;
  const back = (
    <Link href="/datasetlar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t.title}
    </Link>
  );

  if (id === "yangi") {
    return (
      <div className="max-w-5xl">
        {back}
        <h1 className="mb-6 mt-2 text-2xl font-bold">{t.new}</h1>
        <DatasetUploader />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: ds } = await supabase
    .from("datasets")
    .select("*, exercise_datasets(exercises(id, title, lessons(title)))")
    .eq("id", id)
    .maybeSingle();
  if (!ds) notFound();
  const columns = (ds.columns as Array<{ name: string; type: string }>) ?? [];
  const usedIn = ds.exercise_datasets.map((x) => x.exercises).filter(Boolean);

  return (
    <div className="max-w-5xl space-y-6">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold">{ds.table_name}</h1>
          <p className="text-muted">
            {ds.name} · {t.rows(ds.row_count)}
          </p>
          {ds.description ? <p className="mt-2 max-w-2xl text-sm">{ds.description}</p> : null}
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteDataset.bind(null, ds.id)} className="btn-danger" danger />
      </div>
      <section>
        <h2 className="text-sm font-bold">{t.columns}</h2>
        <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
          {columns.map((c) => (
            <li key={c.name} className="rounded-md border border-border bg-surface px-2 py-1">
              {c.name} <span className="text-muted">{c.type.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-bold">{t.preview}</h2>
        <ResultTable columns={columns.map((c) => c.name)} rows={(ds.preview as Cell[][]) ?? []} />
      </section>
      <section>
        <h2 className="text-sm font-bold">{t.usedIn}</h2>
        {usedIn.length === 0 ? (
          <p className="mt-1 text-sm text-muted">{t.notUsed}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {usedIn.map((x) => (
              <li key={x.id}>
                <Link href={`/mashqlar/${x.id}`} className="link">
                  {x.title}
                </Link>{" "}
                <span className="text-muted">· {x.lessons?.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
