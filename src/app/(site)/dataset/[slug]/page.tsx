import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, Download, LogIn, Rows3, Trophy } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { formatSize } from "@/lib/storage-links";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;
const t = uz.openData;
type Column = { name: string; description?: string };

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("open_datasets").select("*").eq("slug", slug).eq("is_published", true).is("archived_at", null).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  return d ? { title: d.title, description: d.short_description } : {};
}

export default async function OpenDatasetPage({ params }: { params: Params }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("challenges")
    .select("title, slug")
    .eq("dataset_id", d.id)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("starts_at", { ascending: false })
    .limit(3);
  const columns = (Array.isArray(d.columns) ? d.columns : []) as Column[];
  const preview = (Array.isArray(d.preview) ? d.preview : []) as unknown[][];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link href="/datasetlar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.back}
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Database className="size-4 text-accent-text" aria-hidden="true" />
            {d.industry || t.title}
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{d.title}</h1>
          <p className="mt-3 text-lg text-muted">{d.short_description}</p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {d.row_count ? (
              <li className="inline-flex items-center gap-1.5">
                <Rows3 className="size-4" aria-hidden="true" />
                {t.rows(d.row_count)}
              </li>
            ) : null}
            {columns.length > 0 ? <li>{t.columnsCount(columns.length)}</li> : null}
            {d.size_bytes ? <li>{formatSize(d.size_bytes)}</li> : null}
            <li>{t.downloads(d.download_count)}</li>
          </ul>
        </div>
        <div className="w-full sm:w-auto">
          {!d.file_path ? (
            <p className="text-sm text-muted">{t.noFile}</p>
          ) : user ? (
            <a href={`/api/open-data/${d.slug}/download`} className="btn-primary w-full sm:w-auto">
              <Download className="size-4" aria-hidden="true" />
              {t.download}
            </a>
          ) : (
            <Link href={`/kirish?sabab=kerak&next=${encodeURIComponent(`/dataset/${d.slug}`)}`} className="btn-primary w-full sm:w-auto">
              <LogIn className="size-4" aria-hidden="true" />
              {t.loginToDownload}
            </Link>
          )}
        </div>
      </header>

      {d.tags.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {d.tags.map((tag) => (
            <li key={tag} className="rounded-md bg-surface-muted px-2.5 py-1 text-sm font-semibold">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {d.description_md ? (
        <section aria-labelledby="about" className="mt-10">
          <h2 id="about" className="text-xl font-bold">
            {t.about}
          </h2>
          <Markdown className="mt-3">{d.description_md}</Markdown>
        </section>
      ) : null}

      {columns.length > 0 ? (
        <section aria-labelledby="dictionary" className="mt-10">
          <h2 id="dictionary" className="text-xl font-bold">
            {t.dictionary}
          </h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    {t.column}
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    {t.meaning}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {columns.map((c) => (
                  <tr key={c.name}>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs font-semibold">{c.name}</td>
                    <td className="px-4 py-2">{c.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {preview.length > 0 && columns.length > 0 ? (
        <section aria-labelledby="preview" className="mt-10">
          <h2 id="preview" className="text-xl font-bold">
            {t.preview}
          </h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c.name} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c, j) => (
                      <td key={c.name} className="whitespace-nowrap px-3 py-1.5">
                        {row[j] === null || row[j] === undefined || row[j] === "" ? <span className="text-muted">∅</span> : String(row[j])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {challenges && challenges.length > 0 ? (
        <section aria-labelledby="ds-challenges" className="mt-10">
          <h2 id="ds-challenges" className="text-xl font-bold">
            {t.usedIn}
          </h2>
          <ul className="mt-3 space-y-2">
            {challenges.map((c) => (
              <li key={c.slug}>
                <Link href={`/challenge/${c.slug}`} className="inline-flex items-center gap-2 font-semibold text-accent-text hover:underline">
                  <Trophy className="size-4" aria-hidden="true" />
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <aside className="mt-12 rounded-xl border border-border bg-accent-soft p-6 text-center">
        <p className="text-lg font-bold">{t.cta}</p>
        <Link href="/#kurslar" className="btn-primary mt-4">
          {t.ctaButton}
        </Link>
      </aside>
    </div>
  );
}
