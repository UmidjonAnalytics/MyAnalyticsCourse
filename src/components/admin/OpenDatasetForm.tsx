"use client";

import { useActionState, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { saveOpenDataset } from "@/app/admin/(panel)/actions/content";
import { Checkbox, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields, submitWith } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import type { FormState } from "@/lib/admin/context";
import type { OpenDataset } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/client";

const t = uz.admin.openData;
const c = uz.admin.common;
const MAX = 100 * 1024 * 1024;

/** Minimal CSV line splitter (quotes, "" escapes, , or ; separator). Enough for a preview. */
function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

type Column = { name: string; description?: string };

export function OpenDatasetForm({ dataset }: { dataset?: OpenDataset }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOpenDataset, { status: "idle" });
  const initialColumns = (Array.isArray(dataset?.columns) ? dataset.columns : []) as Column[];
  const [file, setFile] = useState({
    path: dataset?.file_path ?? "",
    name: dataset?.file_name ?? "",
    size: dataset?.size_bytes != null ? String(dataset.size_bytes) : "",
  });
  const [rowCount, setRowCount] = useState(dataset?.row_count != null ? String(dataset.row_count) : "");
  const [columns, setColumns] = useState(initialColumns.map((col) => (col.description ? `${col.name} — ${col.description}` : col.name)).join("\n"));
  const [preview, setPreview] = useState(JSON.stringify(Array.isArray(dataset?.preview) ? dataset.preview : []));
  const [uploading, setUploading] = useState(false);

  const readCsv = async (f: File) => {
    // Header, first 10 rows and row count (counting needs the whole text: only for files up to 30 MB).
    const head = await f.slice(0, 256 * 1024).text();
    const lines = head.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return;
    const sep = (lines[0]!.match(/;/g)?.length ?? 0) > (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
    const header = splitCsv(lines[0]!, sep);
    const known = new Map(initialColumns.map((col) => [col.name, col.description ?? ""]));
    setColumns(header.map((h) => (known.get(h) ? `${h} — ${known.get(h)}` : h)).join("\n"));
    setPreview(JSON.stringify(lines.slice(1, 11).map((l) => splitCsv(l, sep))));
    if (f.size <= 30 * 1024 * 1024) {
      const all = await f.text();
      const n = all.split(/\r?\n/).filter((l) => l.trim().length > 0).length - 1;
      setRowCount(String(Math.max(0, n)));
    }
  };

  const upload = async (f: File) => {
    if (f.size > MAX) return toast(t.uploadError, "error");
    setUploading(true);
    const ext = (f.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const path = `${crypto.randomUUID()}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("open-data").upload(path, f, { upsert: false, contentType: f.type || undefined });
    setUploading(false);
    if (error) return toast(t.uploadError, "error");
    // An earlier upload that was never saved is removed right away.
    if (file.path && file.path !== dataset?.file_path) await supabase.storage.from("open-data").remove([file.path]);
    setFile({ path, name: f.name, size: String(f.size) });
    if (ext === "csv" || ext === "txt") await readCsv(f);
  };

  return (
    <form onSubmit={submitWith(action)} className="card space-y-6 p-5 sm:p-6">
      {dataset ? <input type="hidden" name="id" value={dataset.id} /> : null}
      <input type="hidden" name="file_path" value={file.path} />
      <input type="hidden" name="file_name" value={file.name} />
      <input type="hidden" name="size_bytes" value={file.size} />
      <input type="hidden" name="preview" value={preview} />
      <TitleSlugFields title={dataset?.title} slug={dataset?.slug} />
      <TextField name="short_description" label={c.shortDescription} defaultValue={dataset?.short_description} maxLength={300} />
      <TextField name="industry" label={t.industry} defaultValue={dataset?.industry} maxLength={80} />
      <div>
        <label htmlFor="od-tags" className="label">
          {t.tags}
        </label>
        <textarea id="od-tags" name="tags" rows={3} defaultValue={(dataset?.tags ?? []).join("\n")} className="input min-h-20 py-2 text-sm" />
      </div>

      <div>
        <p className="label">{t.file}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? t.uploading : t.upload}
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.zip,.parquet,.json"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
          {file.name ? <span className="text-sm font-semibold">{t.uploaded(file.name)}</span> : null}
        </div>
        <p className="mt-1 text-xs text-muted">{t.fileHint}</p>
      </div>

      <div className="max-w-56">
        <label htmlFor="od-rows" className="label">
          {t.rowCount}
        </label>
        <input id="od-rows" name="row_count" className="input" inputMode="numeric" value={rowCount} onChange={(e) => setRowCount(e.target.value)} />
      </div>
      <div>
        <label htmlFor="od-columns" className="label">
          {t.columns}
        </label>
        <textarea
          id="od-columns"
          name="columns"
          rows={8}
          value={columns}
          onChange={(e) => setColumns(e.target.value)}
          className="input min-h-40 py-2 font-mono text-xs"
          placeholder={"order_id — Buyurtma raqami\norder_date — Sana"}
        />
      </div>
      <MarkdownField name="description_md" label={t.description} defaultValue={dataset?.description_md} rows={8} />
      <Checkbox name="is_published" label={c.published} defaultChecked={dataset?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton pending={pending} label={dataset ? c.save : c.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
