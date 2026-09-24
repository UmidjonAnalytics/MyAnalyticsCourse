import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE } from "@/lib/auth/constants";
import type { Profile } from "@/lib/database.types";

export type CurrentUser = { id: string; profile: Profile; deviceId: string | null };

/** The logged-in user and their profile, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile) return null;

  const cookieStore = await cookies();
  return { id: data.user.id, profile, deviceId: cookieStore.get(DEVICE_COOKIE)?.value ?? null };
});
