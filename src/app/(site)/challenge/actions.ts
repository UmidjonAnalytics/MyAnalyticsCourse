"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  challengeId: z.uuid(),
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/),
  link_url: z
    .string()
    .trim()
    .max(1000)
    .refine((v) => /^https:\/\/[^\s]+\.[^\s]+$/.test(v), uz.challenge.linkInvalid),
  summary: z.string().trim().max(2000),
  image_path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/)
    .nullable(),
});

/** Creates or updates the user's entry. RLS allows it only while the challenge is open. */
export async function submitChallengeEntry(raw: z.input<typeof schema>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? uz.challenge.error };
  const { challengeId, slug, ...values } = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (values.image_path && !values.image_path.startsWith(`${userId}/`)) return { ok: false, error: uz.challenge.error };
  if (!(await rateLimit(`challenge:${userId}`, 10, 300))) return { ok: false, error: uz.errors.tooManyRequests };

  const { data: open } = await supabase.rpc("challenge_is_open", { p_challenge_id: challengeId });
  if (!open) return { ok: false, error: uz.challenge.closed };

  const { data: existing } = await supabase
    .from("challenge_entries")
    .select("id, image_path")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("challenge_entries").update(values).eq("id", existing.id)
    : await supabase.from("challenge_entries").insert({ challenge_id: challengeId, user_id: userId, ...values });
  if (error) {
    console.error("challenge entry failed", error.message);
    return { ok: false, error: uz.challenge.error };
  }
  // A replaced screenshot is removed from storage (own folder only; RLS checks it).
  if (existing?.image_path && existing.image_path !== values.image_path) {
    await supabase.storage.from("challenge-images").remove([existing.image_path]);
  }
  revalidatePath(`/challenge/${slug}`);
  return { ok: true };
}
