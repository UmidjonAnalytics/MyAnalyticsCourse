import "server-only";
import { cache } from "react";
import type { Bundle, Category, Course, Lesson, Module, ProgressStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

// Student-facing catalog queries. Only published, non-archived content is returned here
// (admins see drafts in the admin panel instead).

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type CourseCard = Pick<Course, "id" | "title" | "slug" | "short_description" | "cover_url" | "price" | "category_id"> & {
  lessonCount: number;
  categoryName: string | null;
  owned: boolean;
};

export type BundleCard = Pick<Bundle, "id" | "title" | "slug" | "short_description" | "cover_url" | "price"> & {
  courseIds: string[];
};

/** Course ids the user can open (active enrollment). Admins: every course. */
export async function getAccessibleCourseIds(supabase: Supabase, userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const [{ data: enrollments }, { data: admin }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("course_id, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null),
    supabase.rpc("is_admin"),
  ]);
  if (admin === true) {
    const { data: all } = await supabase.from("courses").select("id");
    return new Set((all ?? []).map((c) => c.id));
  }
  const now = Date.now();
  return new Set(
    (enrollments ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id),
  );
}

/** Course ids the user actually owns (enrollments only, admins not special). */
export async function getOwnedCourseIds(supabase: Supabase, userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data } = await supabase
    .from("enrollments")
    .select("course_id, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null);
  const now = Date.now();
  return new Set(
    (data ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id),
  );
}

export async function listCatalog(supabase: Supabase, userId: string | null) {
  const [categories, courses, bundles, owned] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase
      .from("courses")
      .select("id, title, slug, short_description, cover_url, price, category_id, lessons(count)")
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("bundles")
      .select("id, title, slug, short_description, cover_url, price, bundle_courses(course_id)")
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    getOwnedCourseIds(supabase, userId),
  ]);
  if (categories.error || courses.error || bundles.error) return null;

  const catName = new Map(categories.data.map((c) => [c.id, c.name]));
  const courseCards: CourseCard[] = courses.data.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    short_description: c.short_description,
    cover_url: c.cover_url,
    price: c.price,
    category_id: c.category_id,
    lessonCount: c.lessons[0]?.count ?? 0,
    categoryName: c.category_id ? (catName.get(c.category_id) ?? null) : null,
    owned: owned.has(c.id),
  }));
  const visibleIds = new Set(courseCards.map((c) => c.id));
  const bundleCards: BundleCard[] = bundles.data.map((b) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    short_description: b.short_description,
    cover_url: b.cover_url,
    price: b.price,
    courseIds: b.bundle_courses.map((bc) => bc.course_id).filter((id) => visibleIds.has(id)),
  }));
  // Only show categories that have at least one course.
  const usedCats = new Set(courseCards.map((c) => c.category_id));
  return {
    categories: categories.data.filter((c) => usedCats.has(c.id)) as Category[],
    courses: courseCards,
    bundles: bundleCards,
  };
}

// ------------------------------------------------------------
// Course outline: modules + lessons + the student's progress
// ------------------------------------------------------------

export type LessonState = "completed" | "current" | "open" | "locked";

export type OutlineLesson = Pick<Lesson, "id" | "title" | "slug" | "position" | "is_free_preview" | "duration_minutes"> & {
  status: ProgressStatus | null;
  state: LessonState;
  number: number; // 1-based across the whole course
};

export type OutlineModule = Pick<Module, "id" | "title" | "position"> & { lessons: OutlineLesson[] };

export type CourseOutline = {
  course: Course & { categoryName: string | null };
  modules: OutlineModule[];
  lessons: OutlineLesson[]; // flat, in order
  hasAccess: boolean;
  owned: boolean;
  total: number;
  completed: number;
  percent: number;
  /** Lesson to open with "Davom etish": first unfinished open lesson. */
  next: OutlineLesson | null;
};

async function loadOutline(slug: string, userId: string | null): Promise<CourseOutline | null> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("*, categories(name)")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!course) return null;

  const [modulesRes, lessonsRes, accessible, owned] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, position")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("lessons")
      .select("id, module_id, title, slug, position, is_free_preview, duration_minutes")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("position"),
    getAccessibleCourseIds(supabase, userId),
    getOwnedCourseIds(supabase, userId),
  ]);

  const lessonIds = (lessonsRes.data ?? []).map((l) => l.id);
  const progress = new Map<string, ProgressStatus>();
  if (userId && lessonIds.length > 0) {
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_id, status")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);
    for (const p of data ?? []) progress.set(p.lesson_id, p.status);
  }

  const hasAccess = accessible.has(course.id);
  let number = 0;
  const modules: OutlineModule[] = (modulesRes.data ?? []).map((m) => ({
    ...m,
    lessons: (lessonsRes.data ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => {
        number += 1;
        const status = progress.get(l.id) ?? null;
        const canOpen = hasAccess || l.is_free_preview;
        const state: LessonState = !canOpen ? "locked" : status === "completed" ? "completed" : "open";
        return {
          id: l.id,
          title: l.title,
          slug: l.slug,
          position: l.position,
          is_free_preview: l.is_free_preview,
          duration_minutes: l.duration_minutes,
          status,
          state,
          number,
        };
      }),
  }));
  // A module whose lessons are all drafts stays hidden from students.
  const visibleModules = modules.filter((m) => m.lessons.length > 0);
  const lessons = visibleModules.flatMap((m) => m.lessons);
  const next = lessons.find((l) => l.state === "open") ?? lessons.find((l) => l.state !== "locked") ?? null;
  if (next && next.state === "open") next.state = "current";
  const completed = lessons.filter((l) => l.status === "completed").length;
  const total = lessons.length;

  const { categories, ...rest } = course;
  return {
    course: { ...rest, categoryName: categories?.name ?? null },
    modules: visibleModules,
    lessons,
    hasAccess,
    owned: owned.has(course.id),
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    next,
  };
}

/** Cached per request, so the lesson layout and page share one query. */
export const getCourseOutline = cache(loadOutline);

export async function getBundlesForCourse(supabase: Supabase, courseId: string) {
  const { data } = await supabase
    .from("bundle_courses")
    .select("bundles!inner(id, title, slug, price, short_description, is_published, archived_at)")
    .eq("course_id", courseId);
  return (data ?? [])
    .map((r) => r.bundles)
    .filter((b) => b.is_published && !b.archived_at);
}
