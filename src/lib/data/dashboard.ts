import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Student dashboard numbers ("Mening kurslarim"): where to continue, totals, weekly streak, activity.
// Weeks start on Monday, in Tashkent time (UTC+5).

type Supabase = Awaited<ReturnType<typeof createClient>>;
const TZ_MS = 5 * 3_600_000;
const WEEK_MS = 7 * 86_400_000;

/** Monday 00:00 (Tashkent) of the week containing `t`, as a UTC timestamp. */
export function weekStart(t: number): number {
  const local = new Date(t + TZ_MS);
  const day = (local.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day) - TZ_MS;
}

/** Consecutive weeks with at least one completed lesson, ending this week (or last week, if this one is still empty). */
export function weeklyStreak(completedAt: number[], now = Date.now()): number {
  const weeks = new Set(completedAt.map(weekStart));
  let w = weekStart(now);
  if (!weeks.has(w)) w -= WEEK_MS;
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w -= WEEK_MS;
  }
  return n;
}

export type Dashboard = {
  continueAt: { courseSlug: string; courseTitle: string; lessonSlug: string; lessonTitle: string } | null;
  lessonsDone: number;
  minutesLearned: number;
  streak: number;
  activity: { weekStart: number; count: number }[]; // oldest first, 12 weeks
};

export async function getDashboard(supabase: Supabase, userId: string, accessibleCourseIds: Set<string>): Promise<Dashboard> {
  const { data } = await supabase
    .from("lesson_progress")
    .select("status, completed_at, updated_at, lessons(slug, title, duration_minutes, course_id, is_published, archived_at, courses(slug, title))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(2000);
  const rows = (data ?? []).filter((r) => r.lessons && r.lessons.is_published && !r.lessons.archived_at && accessibleCourseIds.has(r.lessons.course_id));
  const done = rows.filter((r) => r.status === "completed");
  const completedAt = done.map((r) => Date.parse(r.completed_at ?? r.updated_at));

  // Continue at: the most recently opened lesson that is not finished yet (else the last one touched).
  const last = rows.find((r) => r.status !== "completed") ?? rows[0];
  const now = Date.now();
  const thisWeek = weekStart(now);
  const activity = Array.from({ length: 12 }, (_, i) => {
    const start = thisWeek - (11 - i) * WEEK_MS;
    return { weekStart: start, count: completedAt.filter((t) => t >= start && t < start + WEEK_MS).length };
  });

  return {
    continueAt:
      last?.lessons?.courses
        ? { courseSlug: last.lessons.courses.slug, courseTitle: last.lessons.courses.title, lessonSlug: last.lessons.slug, lessonTitle: last.lessons.title }
        : null,
    lessonsDone: done.length,
    minutesLearned: done.reduce((a, r) => a + (r.lessons?.duration_minutes ?? 0), 0),
    streak: weeklyStreak(completedAt, now),
    activity,
  };
}
