"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export type NameFormState = { status: "idle" | "saved" | "error"; message?: string };

const nameSchema = z.string().trim().min(2).max(80);

export async function updateFullName(_prev: NameFormState, formData: FormData): Promise<NameFormState> {
  const parsed = nameSchema.safeParse(formData.get("full_name"));
  if (!parsed.success) return { status: "error", message: uz.errors.nameInvalid };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "error", message: uz.errors.notLoggedIn };

  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", userId);
  if (error) return { status: "error", message: uz.errors.generic };

  revalidatePath("/", "layout");
  return { status: "saved" };
}

// ------------------------------------------------------------------ public profile (portfolio)

const RESERVED = new Set(["admin", "administrator", "api", "auth", "kirish", "profil", "support", "yordam", "root", "system", "test", "null", "undefined"]);
const optionalHttps = z
  .string()
  .trim()
  .max(300)
  .transform((v) => v || null)
  .refine((v) => v === null || /^https:\/\/[^\s]+\.[^\s]+$/.test(v), uz.publicProfile.linkInvalid);

const publicSchema = z.object({
  is_public: z.boolean(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[a-z0-9_]{3,30}$/.test(v), uz.publicProfile.usernameInvalid)
    .refine((v) => v === null || !RESERVED.has(v), uz.publicProfile.usernameReserved),
  headline: z.string().trim().max(120),
  location: z.string().trim().max(80),
  bio: z.string().trim().max(1000),
  linkedin_url: optionalHttps,
  github_url: optionalHttps,
  website_url: optionalHttps,
});

export type PublicProfileResult = { ok: true; username: string | null } | { ok: false; error: string };

export async function savePublicProfile(raw: z.input<typeof publicSchema>): Promise<PublicProfileResult> {
  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? uz.errors.generic };
  const values = parsed.data;
  if (values.is_public && !values.username) return { ok: false, error: uz.publicProfile.usernameRequired };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: uz.errors.notLoggedIn };
  if (values.is_public) {
    const { data: me } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
    if (!me?.full_name.trim()) return { ok: false, error: uz.publicProfile.nameRequired };
  }

  // RLS + column grants: students can change only these fields of their own row.
  const { error } = await supabase.from("profiles").update(values).eq("id", userId);
  if (error) return { ok: false, error: error.code === "23505" ? uz.publicProfile.usernameTaken : uz.errors.generic };
  revalidatePath("/profil");
  if (values.username) revalidatePath(`/u/${values.username}`);
  return { ok: true, username: values.username };
}
