"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import { OUTLINE_LIMITS, parseOutline } from "@/lib/admin/outline";
import { uz } from "@/lib/i18n/uz";
import { youtubeId } from "@/lib/youtube";

// Bulk course building: create a whole outline at once, and save many lessons' videos/flags at once.
// Both go through one database function each, so a failure never leaves half a course behind.

const t = uz.admin.bulk;

export async function importOutline(courseId: string, text: string, freeCount: number): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(courseId).success || typeof text !== "string" || text.length > 200_000)
    return { ok: false, error: uz.admin.errors.invalid };
  const free = z.number().int().min(0).max(OUTLINE_LIMITS.lessons).safeParse(freeCount);
  if (!free.success) return { ok: false, error: t.freeInvalid };

  // Parse again on the server: never trust the browser's preview.
  const outline = parseOutline(text);
  if (outline.lessonCount === 0) return { ok: false, error: t.nothingToImport };
  if (outline.problems.length > 0) return { ok: false, error: t.fixProblems };

  const { data, error } = await ctx.supabase.rpc("admin_import_outline", {
    p_course_id: courseId,
    p_modules: outline.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({ title: l.title, slug: l.slug, youtube: l.youtube, minutes: l.minutes })),
    })),
    p_free_count: free.data,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: t.imported(data.modules, data.lessons) };
}

const rowSchema = z.object({
  id: z.uuid(),
  youtube: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || youtubeId(v) !== null, uz.admin.errors.youtubeInvalid),
  minutes: z.number().int().min(0).max(600).nullable(),
  free: z.boolean(),
  published: z.boolean(),
});

export type LessonRow = z.input<typeof rowSchema>;

export async function updateLessons(courseId: string, rows: LessonRow[]): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(courseId).success) return { ok: false, error: uz.admin.errors.invalid };
  const parsed = z
    .array(rowSchema)
    .min(1)
    .max(OUTLINE_LIMITS.lessons * 2)
    .safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? uz.admin.errors.invalid };

  const { data, error } = await ctx.supabase.rpc("admin_update_lessons", {
    p_course_id: courseId,
    p_rows: parsed.data.map((r) => ({ ...r, youtube: r.youtube || null })),
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: t.saved(data) };
}
