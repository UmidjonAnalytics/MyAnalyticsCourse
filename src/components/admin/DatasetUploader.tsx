"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { createDataset } from "@/app/admin/(panel)/actions/practice";
import { toast } from "@/components/admin/toast";
import { Notice } from "@/components/Notice";
import { ResultTable } from "@/components/practice/ResultTable";
import { uz } from "@/lib/i18n/uz";
import type { Cell } from "@/lib/practice/checker";
import { csvToParquet } from "@/lib/practice/duckdb";
import { createClient } from "@/lib/supabase/client";

const t = uz.admin.datasets;

type Parsed = { columns: Array<{ name: string; type: string }>; rowCount: number; preview: Cell[][]; parquet: Uint8Array };

function toTableName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(base) ? base.slice(0, 63) : `t_${base}`.slice(0, 63);
}

// CSV -> (DuckDB in this browser) -> preview + Parquet -> private "datasets" bucket -> database row.
export function DatasetUploader() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tableName, setTableName] = useState("");
  const [description, setDescription] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [phase, setPhase] = useState<"idle" | "reading" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function read(file: File) {
    setError(null);
    setParsed(null);
    setPhase("reading");
    try {
      const out = await csvToParquet(file);
      setParsed(out);
      if (!tableName) setTableName(toTableName(file.name));
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError(t.readError);
    } finally {
      setPhase("idle");
    }
  }

  async function save() {
    if (!parsed) return;
    setError(null);
    setPhase("uploading");
    const path = `v1/${crypto.randomUUID()}.parquet`;
    const { error: upErr } = await createClient()
      .storage.from("datasets")
      .upload(path, new Blob([parsed.parquet as BlobPart], { type: "application/octet-stream" }), { upsert: false });
    if (upErr) {
      setPhase("idle");
      setError(t.uploadError);
      return;
    }
    const res = await createDataset({
      name,
      table_name: tableName,
      description,
      storage_path: path,
      columns: parsed.columns,
      row_count: parsed.rowCount,
      preview: parsed.preview,
    });
    setPhase("idle");
    if (!res.ok) {
      setError(res.error);
      await createClient().storage.from("datasets").remove([path]);
      return;
    }
    toast(uz.admin.common.saved);
    router.push(`/datasetlar/${res.id}`);
  }

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      <div>
        <label className="btn-secondary cursor-pointer">
          {phase === "reading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileUp className="size-4" aria-hidden="true" />}
          {phase === "reading" ? t.reading : t.file}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={phase !== "idle"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void read(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-1 text-xs text-muted">{t.fileHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ds-name" className="label">
            {t.name}
          </label>
          <input id="ds-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <label htmlFor="ds-table" className="label">
            {t.tableName}
          </label>
          <input
            id="ds-table"
            className="input font-mono text-sm"
            value={tableName}
            onChange={(e) => setTableName(e.target.value.toLowerCase())}
            pattern="[a-z][a-z0-9_]*"
            maxLength={63}
            aria-describedby="ds-table-h"
          />
          <p id="ds-table-h" className="mt-1 text-xs text-muted">
            {t.tableNameHint}
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="ds-desc" className="label">
          {t.description}
        </label>
        <textarea id="ds-desc" className="input py-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {parsed ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold">
              {t.columns} · {t.rows(parsed.rowCount)}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
              {parsed.columns.map((c) => (
                <li key={c.name} className="rounded-md border border-border px-2 py-1">
                  {c.name} <span className="text-muted">{c.type.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold">{t.preview}</h2>
            <ResultTable columns={parsed.columns.map((c) => c.name)} rows={parsed.preview} />
          </div>
          <button type="button" className="btn-primary" onClick={() => void save()} disabled={phase !== "idle" || !name || !tableName}>
            {phase === "uploading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {phase === "uploading" ? t.uploading : t.upload}
          </button>
        </div>
      ) : null}
    </div>
  );
}
