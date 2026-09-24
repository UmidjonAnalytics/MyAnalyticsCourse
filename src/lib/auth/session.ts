import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type CurrentUser = { id: string; profile: Profile | null };

/** Logged-in user + profile, or null. Safe to call from Server Components. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return { id, profile };
}

/** Redirects to the login page when nobody is logged in. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/kirish?sabab=kerak&next=${encodeURIComponent(next)}`);
  return user;
}

/** For admin pages: must be logged in AND have role 'admin' (RLS enforces this again). */
export async function requireAdmin(): Promise<CurrentUser & { profile: Profile }> {
  const user = await getCurrentUser();
  if (!user) redirect("/kirish?sabab=kerak");
  if (user.profile?.role !== "admin") redirect("/ruxsat-yoq");
  return user as CurrentUser & { profile: Profile };
}
