import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Course ids the current user has active access to (RLS returns only their own rows). */
export async function getAccessibleCourseIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
  const now = Date.now();
  return new Set(
    (data ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id),
  );
}
