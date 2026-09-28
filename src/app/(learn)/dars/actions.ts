"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { answerCorrect } from "@/lib/practice/answers";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Lesson progress. RLS only allows writing progress for lessons the student can open.
const input = z.object({
  lessonId: z.uuid(),
  courseSlug: z.string().min(1).max(100),
  status: z.enum(["started", "completed", "reset"]),
});

export async function setLessonProgress(raw: z.input<typeof input>): Promise<{ ok: boolean }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { lessonId, courseSlug, status } = parsed.data;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };

  if (status === "started") {
    // Only creates the row the first time; never downgrades "completed".
    const { error } = await supabase
      .from("lesson_progress")
      .upsert({ user_id: userId, lesson_id: lessonId, status: "started" }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    return { ok: !error };
  }

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      status: status === "completed" ? "completed" : "started",
      completed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) return { ok: false };
  revalidatePath(`/dars/${courseSlug}`, "layout");
  revalidatePath("/mening-kurslarim");
  return { ok: true };
}

// ------------------------------------------------------------------ discussions

const commentSchema = z.object({
  lessonId: z.uuid(),
  courseSlug: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(4000),
  parentId: z.uuid().nullable().default(null),
});

export async function postComment(raw: z.input<typeof commentSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: uz.discussion.tooLong };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`comment:${userId}`, 10, 300))) return { ok: false, error: uz.discussion.tooMany };
  // RLS: only students who can open the lesson may post.
  const { error } = await supabase.from("lesson_comments").insert({
    lesson_id: parsed.data.lessonId,
    user_id: userId,
    body: parsed.data.body,
    parent_id: parsed.data.parentId,
  });
  if (error) return { ok: false, error: uz.discussion.error };
  revalidatePath(`/dars/${parsed.data.courseSlug}`, "layout");
  return { ok: true };
}

export async function deleteComment(id: string, courseSlug: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  // RLS: authors delete their own; admins any.
  const { error, count } = await supabase
    .from("lesson_comments")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { ok: false };
  revalidatePath(`/dars/${courseSlug.slice(0, 100)}`, "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ Excel assignments

const assignmentSchema = z.object({
  assignmentId: z.uuid(),
  answers: z.record(z.uuid(), z.string().max(500)),
});

export type AssignmentResult = { questionId: string; correct: boolean; hint?: string };

export async function checkAssignment(
  raw: z.input<typeof assignmentSchema>,
): Promise<{ ok: true; results: AssignmentResult[]; correct: number; total: number } | { ok: false; error: string }> {
  const parsed = assignmentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: uz.assignment.error };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`assignment:${userId}`, 20, 60))) return { ok: false, error: uz.errors.tooManyRequests };

  // RLS: returns rows only if the student can open this assignment.
  const { data: questions } = await supabase
    .from("assignment_questions")
    .select("id, answer_type, hint")
    .eq("assignment_id", parsed.data.assignmentId)
    .order("position");
  if (!questions?.length) return { ok: false, error: uz.assignment.notReady };

  const admin = createAdminClient();
  const { data: keys } = await admin
    .from("assignment_answer_keys")
    .select("question_id, answers, tolerance, case_sensitive")
    .in("question_id", questions.map((q) => q.id));
  const keyById = new Map((keys ?? []).map((k) => [k.question_id, k]));

  const results: AssignmentResult[] = questions.map((q) => {
    const key = keyById.get(q.id);
    const given = parsed.data.answers[q.id] ?? "";
    const correct = Boolean(
      key && answerCorrect(given, { type: q.answer_type, answers: key.answers, tolerance: Number(key.tolerance), caseSensitive: key.case_sensitive }),
    );
    return { questionId: q.id, correct, ...(correct || !q.hint ? {} : { hint: q.hint }) };
  });
  const correct = results.filter((r) => r.correct).length;

  const { error } = await admin.from("assignment_submissions").insert({
    user_id: userId,
    assignment_id: parsed.data.assignmentId,
    answers: parsed.data.answers,
    results: results as unknown as Json,
    correct,
    total: results.length,
    passed: correct === results.length,
  });
  if (error) console.error("assignment submission insert failed", error.message);
  return { ok: true, results, correct, total: results.length };
}
