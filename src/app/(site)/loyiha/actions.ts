"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/),
  link_url: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => /^https:\/\/[^\s]+\.[^\s]+$/.test(v), uz.projects.linkInvalid),
  summary: z.string().trim().max(4000),
  is_public: z.boolean(),
});

/** Creates or updates the student's submission. RLS: only students who own the course. */
export async function submitProject(raw: z.input<typeof schema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? uz.projects.error };
  const { projectId, slug, ...values } = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`project:${userId}`, 10, 300))) return { ok: false, error: uz.errors.tooManyRequests };

  const { data: existing } = await supabase.from("project_submissions").select("id").eq("project_id", projectId).eq("user_id", userId).maybeSingle();
  // The database puts a changed submission back to "submitted" (trigger), so the instructor re-checks it.
  const { error } = existing
    ? await supabase.from("project_submissions").update(values).eq("id", existing.id)
    : await supabase.from("project_submissions").insert({ project_id: projectId, user_id: userId, ...values });
  if (error) {
    console.error("project submission failed", error.message);
    return { ok: false, error: uz.projects.error };
  }
  revalidatePath(`/loyiha/${slug}`);
  return { ok: true };
}
