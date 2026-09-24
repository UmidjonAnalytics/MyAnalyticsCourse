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

  revalidatePath("/profil");
  return { status: "saved" };
}
