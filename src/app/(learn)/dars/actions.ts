"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
