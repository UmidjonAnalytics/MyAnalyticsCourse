"use server";

import { revalidatePath } from "next/cache";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import type { Json } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { SAMPLE_CHALLENGE, sampleDatasets, toCsv } from "@/lib/sample-data/open-datasets";

/** First and last moment of next month in Tashkent time (UTC+5), as ISO strings. */
function nextMonthTashkent(now = new Date()) {
  const local = new Date(now.getTime() + 5 * 3_600_000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1; // next month index (0-based + 1)
  const start = new Date(Date.UTC(y, m, 1, 0, 0) - 5 * 3_600_000);
  const end = new Date(Date.UTC(y, m + 1, 1, 0, 0) - 5 * 3_600_000 - 60_000);
  return { starts_at: start.toISOString(), ends_at: end.toISOString() };
}

/**
 * Adds the sample datasets (published) and a draft challenge for next month. Uses the admin's own
 * session (storage + RLS allow admins), so no secret key is involved. Existing slugs are skipped.
 */
export async function installSampleContent(): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const samples = sampleDatasets();
  const { data: existing } = await ctx.supabase.from("open_datasets").select("id, slug").in("slug", samples.map((s) => s.slug));
  const have = new Map((existing ?? []).map((d) => [d.slug, d.id]));
  const { count } = await ctx.supabase.from("open_datasets").select("id", { count: "exact", head: true });
  let position = count ?? 0;
  let added = 0;

  for (const d of samples) {
    if (have.has(d.slug)) continue;
    const csv = toCsv(d);
    const path = `${crypto.randomUUID()}/${crypto.randomUUID()}.csv`;
    const { error: upErr } = await ctx.supabase.storage
      .from("open-data")
      .upload(path, new Blob([csv], { type: "text/csv" }), { contentType: "text/csv; charset=utf-8", upsert: false });
    if (upErr) return { ok: false, error: `${d.title}: ${upErr.message}` };
    const { data: row, error } = await ctx.supabase
      .from("open_datasets")
      .insert({
        title: d.title,
        slug: d.slug,
        short_description: d.short_description,
        description_md: d.description_md,
        industry: d.industry,
        tags: d.tags,
        file_path: path,
        file_name: `${d.slug}.csv`,
        size_bytes: new TextEncoder().encode(csv).length,
        row_count: d.rows.length,
        columns: d.columns as unknown as Json,
        preview: d.rows.slice(0, 10).map((r) => r.map((v) => (v === null ? null : String(v)))) as unknown as Json,
        is_published: true,
        position: ++position,
      })
      .select("id")
      .single();
    if (error) {
      await ctx.supabase.storage.from("open-data").remove([path]);
      return { ok: false, error: dbErrorMessage(error) };
    }
    have.set(d.slug, row.id);
    added++;
  }

  let challengeAdded = 0;
  const { data: ch } = await ctx.supabase.from("challenges").select("id").eq("slug", SAMPLE_CHALLENGE.slug).maybeSingle();
  if (!ch) {
    const { datasetSlug, ...fields } = SAMPLE_CHALLENGE;
    const { error } = await ctx.supabase.from("challenges").insert({
      ...fields,
      dataset_id: have.get(datasetSlug) ?? null,
      prize: "",
      is_published: false,
      ...nextMonthTashkent(),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    challengeAdded = 1;
  }

  await audit(ctx.supabase, ctx.userId, "install_samples", "open_dataset", null, { datasets: added, challenge: challengeAdded });
  revalidatePath("/", "layout");
  return added || challengeAdded
    ? { ok: true, message: uz.admin.openData.samplesDone(added, challengeAdded) }
    : { ok: true, message: uz.admin.openData.samplesNothing };
}
