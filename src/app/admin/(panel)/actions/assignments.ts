"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import { normalizeEmbedUrl } from "@/lib/embed";
import { uz } from "@/lib/i18n/uz";

// Server Actions for Excel assignments and discussion moderation (admin only).

const e = uz.admin.errors;
const t = uz.admin.assignments;
const refresh = () => revalidatePath("/", "layout");

/** New draft assignment on a lesson, or a checkpoint on a portfolio project. */
export async function createAssignment(owner: { lessonId: string } | { projectId: string }): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const [col, id] = "lessonId" in owner ? (["lesson_id", owner.lessonId] as const) : (["project_id", owner.projectId] as const);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { count } = await ctx.supabase.from("assignments").select("id", { count: "exact", head: true }).eq(col, id);
  const { data, error } = await ctx.supabase
    .from("assignments")
    .insert({ ...("lessonId" in owner ? { lesson_id: id } : { project_id: id }), title: t.newTitle, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "assignment", data.id, { [col]: id });
  refresh();
  return { ok: true, id: data.id };
}

const questionSchema = z.object({
  id: z.uuid().optional(),
  prompt: z.string().trim().min(1, t.prompt).max(1000),
  answer_type: z.enum(["number", "text"]),
  placeholder: z.string().trim().max(200).default(""),
  hint: z.string().trim().max(1000).default(""),
  answers: z.array(z.string().trim().min(1).max(500)).min(1, t.answers).max(20),
  tolerance: z.number().min(0).max(1e12).default(0),
  case_sensitive: z.boolean().default(false),
});

const assignmentSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, e.titleRequired).max(200),
  instructions_md: z.string().max(50_000),
  points: z.number().int().min(0).max(1000),
  is_published: z.boolean(),
  embed_url: z.string().max(4000),
  file_path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[a-z0-9_-]+\.(xlsx|xlsm|xls|csv)$/)
    .nullable(),
  allow_download: z.boolean(),
  questions: z.array(questionSchema).max(50),
});

export async function saveAssignment(input: z.input<typeof assignmentSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? e.invalid };
  const { id, questions, embed_url: rawEmbed, file_path, ...values } = parsed.data;

  const embed_url = rawEmbed.trim() ? normalizeEmbedUrl(rawEmbed) : null;
  if (rawEmbed.trim() && !embed_url) return { ok: false, error: t.embedInvalid };
  if (file_path && !file_path.startsWith(`${id}/`)) return { ok: false, error: e.invalid };
  if (values.is_published && questions.length === 0) return { ok: false, error: t.noQuestions };

  const { data: before } = await ctx.supabase.from("assignments").select("file_path").eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: e.invalid };

  const { error } = await ctx.supabase.from("assignments").update({ ...values, embed_url, file_path }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  // Questions: remove the ones deleted in the editor, then upsert the rest in order.
  const { data: existing } = await ctx.supabase.from("assignment_questions").select("id").eq("assignment_id", id);
  const keep = new Set(questions.map((q) => q.id).filter(Boolean));
  const removed = (existing ?? []).map((q) => q.id).filter((qid) => !keep.has(qid));
  if (removed.length > 0) {
    const { error: delErr } = await ctx.supabase.from("assignment_questions").delete().in("id", removed);
    if (delErr) return { ok: false, error: dbErrorMessage(delErr) };
  }
  for (const [i, q] of questions.entries()) {
    const row = { assignment_id: id, position: i + 1, prompt: q.prompt, answer_type: q.answer_type, placeholder: q.placeholder, hint: q.hint };
    const { data: saved, error: qErr } = q.id
      ? await ctx.supabase.from("assignment_questions").update(row).eq("id", q.id).eq("assignment_id", id).select("id").single()
      : await ctx.supabase.from("assignment_questions").insert(row).select("id").single();
    if (qErr) return { ok: false, error: dbErrorMessage(qErr) };
    const { error: kErr } = await ctx.supabase
      .from("assignment_answer_keys")
      .upsert(
        { question_id: saved.id, answers: q.answers, tolerance: q.answer_type === "number" ? q.tolerance : 0, case_sensitive: q.case_sensitive },
        { onConflict: "question_id" },
      );
    if (kErr) return { ok: false, error: dbErrorMessage(kErr) };
  }

  // A replaced or removed workbook is deleted from storage.
  if (before.file_path && before.file_path !== file_path) {
    await ctx.supabase.storage.from("assignment-files").remove([before.file_path]);
  }

  await audit(ctx.supabase, ctx.userId, "update", "assignment", id, {
    title: values.title,
    questions: questions.length,
    published: values.is_published,
  });
  refresh();
  return { ok: true, message: uz.admin.common.saved };
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { data: row } = await ctx.supabase.from("assignments").select("file_path").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("assignments").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (row?.file_path) await ctx.supabase.storage.from("assignment-files").remove([row.file_path]);
  await audit(ctx.supabase, ctx.userId, "delete", "assignment", id);
  refresh();
  return { ok: true };
}

/** Moderation: hides a comment (soft delete) under any lesson. */
export async function moderateComment(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from("lesson_comments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "delete", "comment", id);
  refresh();
  return { ok: true };
}
