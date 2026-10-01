"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { addResource, deleteResource } from "@/app/admin/(panel)/actions/learning";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/client";

const t = uz.admin.resources;
const MAX_BYTES = 50 * 1024 * 1024;

export type ResourceRow = { id: string; title: string; file_path: string | null; url: string | null; size_bytes: number | null };

/** Materials of a lesson or of a portfolio project. */
export function ResourceManager({ owner, resources }: { owner: { lessonId: string } | { projectId: string }; resources: ResourceRow[] }) {
  const ownerId = "lessonId" in owner ? owner.lessonId : owner.projectId;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const done = (res: { ok: boolean; error?: string }) => {
    if (!res.ok) {
      toast(res.error ?? uz.admin.errors.generic, "error");
      return false;
    }
    setTitle("");
    setUrl("");
    router.refresh();
    return true;
  };

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) return toast(t.fileError, "error");
    const name = title.trim() || file.name.replace(/\.[^.]+$/, "");
    const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    const path = `${ownerId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    setUploading(true);
    const supabase = createClient();
    const { error } = await supabase.storage.from("lesson-resources").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) {
      setUploading(false);
      return toast(t.fileError, "error");
    }
    const res = await addResource({ ...owner, title: name, file_path: path, url: null, size_bytes: file.size });
    setUploading(false);
    if (!done(res)) await supabase.storage.from("lesson-resources").remove([path]);
  };

  const addLink = () =>
    startTransition(async () => {
      if (!title.trim()) return void toast(t.titleRequired, "error");
      done(await addResource({ ...owner, title, file_path: null, url: url.trim(), size_bytes: null }));
    });

  const remove = (id: string) => {
    if (!window.confirm(t.removeConfirm)) return;
    startTransition(async () => {
      done(await deleteResource(id));
    });
  };

  return (
    <div className="space-y-4">
      {resources.length === 0 ? (
        <p className="text-sm text-muted">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {resources.map((r) => (
            <li key={r.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
              {r.url ? <ExternalLink className="size-4 text-muted" aria-hidden="true" /> : <Download className="size-4 text-muted" aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.title}</span>
                {r.url ? <span className="block truncate text-xs text-muted">{r.url}</span> : null}
              </span>
              <button type="button" className="btn-ghost min-h-9 px-2 text-sm text-danger" onClick={() => remove(r.id)} disabled={pending}>
                <Trash2 className="size-4" aria-hidden="true" />
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 rounded-lg border border-dashed border-border p-4">
        <div>
          <label htmlFor="res-title" className="label">
            {t.titleLabel}
          </label>
          <input id="res-title" className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? t.uploading : t.upload}
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
        </div>
        <div>
          <label htmlFor="res-url" className="label">
            {t.link}
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="res-url" className="input min-w-0 flex-1" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            <button type="button" className="btn-secondary" onClick={addLink} disabled={pending || !url.trim()}>
              <Link2 className="size-4" aria-hidden="true" />
              {t.addLink}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">{t.lead}</p>
      </div>
    </div>
  );
}
