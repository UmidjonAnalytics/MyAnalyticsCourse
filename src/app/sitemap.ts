import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Public pages for search engines: catalog, courses, bundles, paths, projects, legal pages.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !url || !key) return [];
  // Anonymous client: RLS returns only what any visitor may see.
  const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
  const published = <T extends string>(table: T) =>
    supabase.from(table as "courses").select("slug, updated_at").eq("is_published", true).is("archived_at", null);
  const [courses, bundles, paths, projects] = await Promise.all([
    published("courses"),
    published("bundles"),
    published("learning_paths"),
    published("projects"),
  ]);
  const entries = (prefix: string, rows: { slug: string; updated_at: string }[] | null, priority: number) =>
    (rows ?? []).map((r) => ({ url: `${base}/${prefix}/${r.slug}`, lastModified: r.updated_at, priority }));
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/yollar`, priority: 0.8 },
    { url: `${base}/loyihalar`, priority: 0.7 },
    ...entries("kurs", courses.data, 0.9),
    ...entries("toplam", bundles.data, 0.8),
    ...entries("yol", paths.data, 0.8),
    ...entries("loyiha", projects.data, 0.6),
    ...["oferta", "maxfiylik", "qaytarish", "aloqa"].map((p) => ({ url: `${base}/${p}`, priority: 0.3 })),
  ];
}
