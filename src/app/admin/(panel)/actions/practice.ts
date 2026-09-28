"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import type { Json } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

// Server Actions for datasets and SQL exercises (admin only).

const e = uz.admin.errors;
const refresh = () => revalidatePath("/", "layout");
const cell = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);

const datasetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  table_name: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/, uz.admin.datasets.tableNameHint),
  description: z.string().trim().max(1000).default(""),
  storage_path: z.string().regex(/^[a-z0-9_-]+\/[a-z0-9_.-]+$/),
  columns: z.array(z.object({ name: z.string().max(200), type: z.string().max(100) })).max(200),
  row_count: z.number().int().min(0),
  preview: z.array(z.array(cell)).max(20),
});

export async function createDataset(input: z.input<typeof datasetSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = datasetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { data, error } = await ctx.supabase
    .from("datasets")
    .insert({ ...parsed.data, columns: parsed.data.columns as Json, preview: parsed.data.preview as Json })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? uz.admin.datasets.tableTaken : dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "dataset", data.id, { table: parsed.data.table_name, rows: parsed.data.row_count });
  refresh();
  return { ok: true, id: data.id };
}

export async function deleteDataset(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const { count } = await ctx.supabase.from("exercise_datasets").select("exercise_id", { count: "exact", head: true }).eq("dataset_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: uz.admin.datasets.inUse };
  const { data: ds } = await ctx.supabase.from("datasets").select("storage_path").eq("id", id).single();
  const { error } = await ctx.supabase.from("datasets").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (ds) await ctx.supabase.storage.from("datasets").remove([ds.storage_path]);
  await audit(ctx.supabase, ctx.userId, "delete", "dataset", id);
  refresh();
  return { ok: true };
}

export async function createExercise(lessonId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(lessonId).success) return { ok: false, error: e.invalid };
  const { count } = await ctx.supabase.from("exercises").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { data, error } = await ctx.supabase
    .from("exercises")
    .insert({ lesson_id: lessonId, title: uz.admin.exercises.newTitle, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const { defaultRules } = await import("@/lib/practice/checker");
  await ctx.supabase.from("exercise_keys").insert({ exercise_id: data.id, check_rules: defaultRules() as unknown as Json });
  await audit(ctx.supabase, ctx.userId, "create", "exercise", data.id, { lesson: lessonId });
  refresh();
  return { ok: true, id: data.id };
}

const ruleSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().max(40), type: z.literal("row_count"), hint: z.string().max(500).optional() }),
  z.object({ id: z.string().max(40), type: z.literal("columns"), hint: z.string().max(500).optional(), ordered: z.boolean().optional() }),
  z.object({
    id: z.string().max(40),
    type: z.literal("rows"),
    hint: z.string().max(500).optional(),
    ordered: z.boolean().optional(),
    tolerance: z.number().min(0).max(1_000_000).optional(),
  }),
  z.object({
    id: z.string().max(40),
    type: z.literal("column_sum"),
    hint: z.string().max(500).optional(),
    column: z.string().min(1).max(200),
    tolerance: z.number().min(0).max(1_000_000).optional(),
  }),
]);

const exerciseSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, e.titleRequired).max(200),
  task_md: z.string().max(50_000),
  points: z.number().int().min(0).max(1000),
  is_published: z.boolean(),
  dataset_ids: z.array(z.uuid()).max(20),
  reference_sql: z.string().max(20_000),
  check_rules: z.array(ruleSchema).max(20),
});

export async function saveExercise(input: z.input<typeof exerciseSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { id, dataset_ids, reference_sql, check_rules, ...values } = parsed.data;

  const { error } = await ctx.supabase.from("exercises").update(values).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await ctx.supabase.from("exercise_datasets").delete().eq("exercise_id", id);
  if (dataset_ids.length > 0) {
    const { error: linkErr } = await ctx.supabase
      .from("exercise_datasets")
      .insert(dataset_ids.map((dataset_id) => ({ exercise_id: id, dataset_id })));
    if (linkErr) return { ok: false, error: dbErrorMessage(linkErr) };
  }
  const { error: keyErr } = await ctx.supabase
    .from("exercise_keys")
    .upsert({ exercise_id: id, reference_sql, check_rules: check_rules as unknown as Json }, { onConflict: "exercise_id" });
  if (keyErr) return { ok: false, error: dbErrorMessage(keyErr) };

  await audit(ctx.supabase, ctx.userId, "update", "exercise", id, { title: values.title, datasets: dataset_ids });
  refresh();
  return { ok: true, message: uz.admin.common.saved };
}

const expectedSchema = z.object({
  id: z.uuid(),
  reference_sql: z.string().min(1).max(20_000),
  columns: z.array(z.string().max(200)).max(100),
  rows: z.array(z.array(cell).max(100)).max(5000),
});

/** Saves the result of the reference SQL (run in the admin's browser) as the answer key. */
export async function saveExpected(input: z.input<typeof expectedSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = expectedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { id, reference_sql, columns, rows } = parsed.data;
  const { error } = await ctx.supabase
    .from("exercise_keys")
    .upsert({ exercise_id: id, reference_sql, expected: { columns, rows } as Json }, { onConflict: "exercise_id" });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "save_expected", "exercise", id, { rows: rows.length, columns });
  refresh();
  return { ok: true, message: uz.admin.exercises.expectedSaved };
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const { error } = await ctx.supabase.from("exercises").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "delete", "exercise", id);
  refresh();
  return { ok: true };
}
