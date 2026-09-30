"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// Course-level student actions: certificates and reviews.

export type CertificateResult = { ok: true; code: string } | { ok: false; error: string; needName?: boolean };

export async function claimCertificate(courseId: string): Promise<CertificateResult> {
  if (!z.uuid().safeParse(courseId).success) return { ok: false, error: uz.certificate.error };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`cert:${userId}`, 10, 60))) return { ok: false, error: uz.errors.tooManyRequests };

  // The database checks every lesson and quiz (issue_certificate), not this code.
  const { data, error } = await supabase.rpc("issue_certificate", { p_course_id: courseId });
  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("name_required")) return { ok: false, error: uz.certificate.nameRequired, needName: true };
    if (msg.includes("quiz_not_passed")) return { ok: false, error: uz.certificate.quizNotPassed };
    if (msg.includes("not_finished")) return { ok: false, error: uz.certificate.notFinished };
    if (msg.includes("no_access")) return { ok: false, error: uz.certificate.noAccess };
    console.error("issue_certificate failed", msg);
    return { ok: false, error: uz.certificate.error };
  }
  revalidatePath("/mening-kurslarim");
  revalidatePath("/kurs", "layout");
  return { ok: true, code: data };
}

const reviewSchema = z.object({
  courseId: z.uuid(),
  courseSlug: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000),
});

export async function saveReview(raw: z.input<typeof reviewSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: uz.reviews.pickRating };
  const { courseId, courseSlug, rating, body } = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`review:${userId}`, 10, 300))) return { ok: false, error: uz.errors.tooManyRequests };

  // RLS: only students with access to the course can insert; they can edit only their own.
  const { data: existing } = await supabase.from("course_reviews").select("id").eq("course_id", courseId).eq("user_id", userId).maybeSingle();
  const { error } = existing
    ? await supabase.from("course_reviews").update({ rating, body }).eq("id", existing.id)
    : await supabase.from("course_reviews").insert({ course_id: courseId, user_id: userId, rating, body });
  if (error) return { ok: false, error: error.code === "42501" ? uz.reviews.ownersOnly : uz.reviews.error };
  revalidatePath(`/kurs/${courseSlug}`);
  return { ok: true };
}
