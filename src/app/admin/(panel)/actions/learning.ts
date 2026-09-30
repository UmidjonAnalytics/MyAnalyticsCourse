"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";

// Server Actions for quizzes, lesson materials, instructors, reviews and certificates (admin only).

const e = uz.admin.errors;
const refresh = () => revalidatePath("/", "layout");

// ------------------------------------------------------------------ quizzes

const quizQuestionSchema = z.object({
  id: z.uuid().optional(),
  prompt: z.string().trim().max(2000),
  options: z.array(z.string().trim().max(500)).max(8),
  correct: z.array(z.number().int().min(0).max(7)).max(8),
  multiple: z.boolean(),
  explanation: z.string().trim().max(2000).default(""),
});

const quizSchema = z.object({
  lessonId: z.uuid(),
  passPercent: z.number().int().min(0).max(100),
  questions: z.array(quizQuestionSchema).max(50),
});

export async function saveQuiz(input: z.input<typeof quizSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { lessonId, passPercent, questions } = parsed.data;
  const t = uz.admin.quiz;

  // Drop empty options, re-map the correct indexes, validate each question.
  const clean = [];
  for (const [i, q] of questions.entries()) {
    const n = i + 1;
    if (!q.prompt) return { ok: false, error: t.needPrompt(n) };
    const kept = q.options.map((text, idx) => ({ text, idx })).filter((o) => o.text);
    if (kept.length < 2) return { ok: false, error: t.needOptions(n) };
    const correct = kept.flatMap((o, newIdx) => (q.correct.includes(o.idx) ? [newIdx] : []));
    if (correct.length === 0) return { ok: false, error: t.needCorrect(n) };
    const multiple = q.multiple || correct.length > 1;
    clean.push({ ...q, options: kept.map((o) => o.text), correct: multiple ? correct : correct.slice(0, 1), multiple });
  }

  const { error: lessonErr } = await ctx.supabase.from("lessons").update({ quiz_pass_percent: passPercent }).eq("id", lessonId);
  if (lessonErr) return { ok: false, error: dbErrorMessage(lessonErr) };

  const { data: existing } = await ctx.supabase.from("quiz_questions").select("id").eq("lesson_id", lessonId);
  const keep = new Set(clean.map((q) => q.id).filter(Boolean));
  const removed = (existing ?? []).map((q) => q.id).filter((id) => !keep.has(id));
  if (removed.length > 0) {
    const { error } = await ctx.supabase.from("quiz_questions").delete().in("id", removed);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  for (const [i, q] of clean.entries()) {
    const row = { lesson_id: lessonId, position: i + 1, prompt: q.prompt, options: q.options, multiple: q.multiple };
    const { data: saved, error } = q.id
      ? await ctx.supabase.from("quiz_questions").update(row).eq("id", q.id).eq("lesson_id", lessonId).select("id").single()
      : await ctx.supabase.from("quiz_questions").insert(row).select("id").single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    const { error: keyErr } = await ctx.supabase
      .from("quiz_answer_keys")
      .upsert({ question_id: saved.id, correct: q.correct, explanation: q.explanation }, { onConflict: "question_id" });
    if (keyErr) return { ok: false, error: dbErrorMessage(keyErr) };
  }

  await audit(ctx.supabase, ctx.userId, "update", "quiz", lessonId, { questions: clean.length, pass: passPercent });
  refresh();
  return { ok: true, message: t.saved };
}

// ------------------------------------------------------------------ lesson materials

const resourceSchema = z
  .object({
    lessonId: z.uuid(),
    title: z.string().trim().min(1, uz.admin.resources.titleRequired).max(200),
    file_path: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/)
      .nullable(),
    url: z.string().trim().max(2000).nullable(),
    size_bytes: z.number().int().min(0).max(60 * 1024 * 1024).nullable(),
  })
  .refine((v) => (v.file_path === null) !== (v.url === null), { message: e.invalid })
  .refine((v) => v.url === null || /^https:\/\/[^\s]+$/.test(v.url), { message: uz.admin.resources.linkError })
  .refine((v) => v.file_path === null || v.file_path.startsWith(`${v.lessonId}/`), { message: e.invalid });

export async function addResource(input: z.input<typeof resourceSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { lessonId, ...values } = parsed.data;
  const { count } = await ctx.supabase.from("lesson_resources").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId);
  const { data, error } = await ctx.supabase
    .from("lesson_resources")
    .insert({ lesson_id: lessonId, ...values, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "resource", data.id, { lesson: lessonId, title: values.title });
  refresh();
  return { ok: true, id: data.id };
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { data: row } = await ctx.supabase.from("lesson_resources").select("file_path").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("lesson_resources").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (row?.file_path) await ctx.supabase.storage.from("lesson-resources").remove([row.file_path]);
  await audit(ctx.supabase, ctx.userId, "delete", "resource", id);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ instructors

const instructorSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, e.titleRequired).max(120),
  title: z.string().trim().max(200).default(""),
  bio_md: z.string().max(10_000).default(""),
  photo_url: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null)
    .refine((v) => v === null || /^https:\/\//.test(v), { message: e.invalid }),
});

export async function saveInstructor(input: z.input<typeof instructorSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = instructorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { id, ...values } = parsed.data;
  const { data, error } = id
    ? await ctx.supabase.from("instructors").update(values).eq("id", id).select("id").single()
    : await ctx.supabase.from("instructors").insert(values).select("id").single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, id ? "update" : "create", "instructor", data.id, { name: values.name });
  refresh();
  return { ok: true, id: data.id, message: uz.admin.common.saved };
}

export async function deleteInstructor(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from("instructors").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "delete", "instructor", id);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ reviews + certificates

export async function setReviewHidden(id: string, hidden: boolean): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase
    .from("course_reviews")
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, hidden ? "hide" : "show", "review", id);
  refresh();
  return { ok: true };
}

export async function revokeCertificate(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from("certificates").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "revoke", "certificate", id);
  refresh();
  return { ok: true };
}
