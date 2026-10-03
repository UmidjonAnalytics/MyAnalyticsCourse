import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Short-lived links to files in private buckets. Callers must check access first (RLS on the row).

const HOURS_3 = 60 * 60 * 3;

/**
 * File name for downloads: letters, digits, spaces, "-", "_" and "." only. Apostrophes (o', g')
 * are dropped and brackets/dashes become spaces, because storage percent-encodes them in the name.
 */
export function downloadName(title: string) {
  return title
    .replace(/['‘’ʻʼ`]/g, "")
    .replace(/[^\p{L}\p{N} ._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Download links for materials ("lesson-resources" bucket); null for link-only rows. */
export async function resourceLinks(resources: { file_path: string | null; title: string }[]) {
  const storage = createAdminClient().storage.from("lesson-resources");
  return Promise.all(
    resources.map(async (r) => {
      if (!r.file_path) return null;
      const ext = r.file_path.split(".").pop() ?? "";
      const safe = downloadName(r.title) || "material";
      const { data } = await storage.createSignedUrl(r.file_path, HOURS_3, { download: ext ? `${safe}.${ext}` : safe });
      return data?.signedUrl ?? null;
    }),
  );
}

/** View + download links for an uploaded assignment workbook ("assignment-files" bucket). */
export async function workbookLinks(path: string, title: string) {
  const storage = createAdminClient().storage.from("assignment-files");
  const ext = path.split(".").pop() ?? "xlsx";
  const [view, download] = await Promise.all([
    storage.createSignedUrl(path, HOURS_3),
    storage.createSignedUrl(path, HOURS_3, { download: `${downloadName(title) || "topshiriq"}.${ext}` }),
  ]);
  return { view: view.data?.signedUrl ?? null, download: download.data?.signedUrl ?? null };
}
