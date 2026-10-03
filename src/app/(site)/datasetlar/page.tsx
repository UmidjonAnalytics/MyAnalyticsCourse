import type { Metadata } from "next";
import Link from "next/link";
import { Database, Download, Rows3 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.openData.title, description: uz.openData.lead };
const t = uz.openData;

export default async function OpenDataPage({ searchParams }: { searchParams: Promise<{ soha?: string }> }) {
  const { soha } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("open_datasets")
    .select("id, title, slug, short_description, industry, tags, row_count, columns, download_count")
    .eq("is_published", true)
    .is("archived_at", null)
    .order("position");
  const all = data ?? [];
  const industries = [...new Set(all.map((d) => d.industry).filter(Boolean))].sort();
  const list = soha ? all.filter((d) => d.industry === soha) : all;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.lead}</p>
      {industries.length > 1 ? (
        <nav aria-label={t.filterLabel} className="mt-6 flex flex-wrap gap-2">
          {[null, ...industries].map((i) => {
            const active = (i ?? null) === (soha ?? null);
            return (
              <Link
                key={i ?? "all"}
                href={i ? `/datasetlar?soha=${encodeURIComponent(i)}` : "/datasetlar"}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                  active ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:bg-surface-muted"
                }`}
              >
                {i ?? t.all}
              </Link>
            );
          })}
        </nav>
      ) : null}
      {list.length === 0 ? (
        <p className="mt-8 text-muted">{t.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <li key={d.id} className="card group relative flex flex-col p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Database className="size-4 text-accent-text" aria-hidden="true" />
                {d.industry || t.title}
              </div>
              <h2 className="mt-2 text-lg font-bold">
                <Link href={`/dataset/${d.slug}`} className="after:absolute after:inset-0 group-hover:underline">
                  {d.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted">{d.short_description}</p>
              {d.tags.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {d.tags.slice(0, 4).map((tag) => (
                    <li key={tag} className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold">
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {d.row_count ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Rows3 className="size-4" aria-hidden="true" />
                    {t.rows(d.row_count)}
                  </span>
                ) : null}
                {Array.isArray(d.columns) && d.columns.length > 0 ? <span>{t.columnsCount(d.columns.length)}</span> : null}
                <span className="inline-flex items-center gap-1.5">
                  <Download className="size-4" aria-hidden="true" />
                  {d.download_count}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
