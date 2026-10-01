import "server-only";
import { cache } from "react";
import type { CourseLevel } from "@/lib/database.types";
import { getCourseOutline, type CourseOutline } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";

// Student-facing queries for learning paths and portfolio projects (published only; RLS agrees).

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PathCard = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  cover_url: string | null;
  level: CourseLevel | null;
  courseCount: number;
  lessonCount: number;
  minutes: number;
  projectCount: number;
};

/** Lesson count + minutes for each published course (for path totals). */
async function courseTotals(supabase: Supabase, courseIds: string[]) {
  const totals = new Map<string, { lessons: number; minutes: number }>();
  if (courseIds.length === 0) return totals;
  const { data } = await supabase
    .from("lessons")
    .select("course_id, duration_minutes, modules!inner(is_published, archived_at)")
    .in("course_id", courseIds)
    .eq("is_published", true)
    .is("archived_at", null)
    .eq("modules.is_published", true)
    .is("modules.archived_at", null);
  for (const l of data ?? []) {
    const t = totals.get(l.course_id) ?? { lessons: 0, minutes: 0 };
    t.lessons += 1;
    t.minutes += l.duration_minutes ?? 0;
    totals.set(l.course_id, t);
  }
  return totals;
}

export async function listPaths(supabase: Supabase): Promise<PathCard[]> {
  const { data: paths } = await supabase
    .from("learning_paths")
    .select("id, title, slug, short_description, cover_url, level, learning_path_courses(course_id, courses(is_published, archived_at))")
    .eq("is_published", true)
    .is("archived_at", null)
    .order("position");
  if (!paths?.length) return [];
  const courseIdsByPath = new Map(
    paths.map((p) => [
      p.id,
      p.learning_path_courses.filter((pc) => pc.courses?.is_published && !pc.courses.archived_at).map((pc) => pc.course_id),
    ]),
  );
  const allIds = [...new Set([...courseIdsByPath.values()].flat())];
  const [totals, { data: projects }] = await Promise.all([
    courseTotals(supabase, allIds),
    allIds.length
      ? supabase.from("projects").select("course_id").in("course_id", allIds).eq("is_published", true).is("archived_at", null)
      : Promise.resolve({ data: [] as { course_id: string }[] }),
  ]);
  return paths.map((p) => {
    const ids = courseIdsByPath.get(p.id) ?? [];
    const sum = ids.reduce(
      (a, id) => {
        const t = totals.get(id);
        return { lessons: a.lessons + (t?.lessons ?? 0), minutes: a.minutes + (t?.minutes ?? 0) };
      },
      { lessons: 0, minutes: 0 },
    );
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      short_description: p.short_description,
      cover_url: p.cover_url,
      level: p.level,
      courseCount: ids.length,
      lessonCount: sum.lessons,
      minutes: sum.minutes,
      projectCount: (projects ?? []).filter((pr) => ids.includes(pr.course_id)).length,
    };
  });
}

export type PathStep = { outline: CourseOutline; certificateCode: string | null };

async function loadPath(slug: string, userId: string | null) {
  const supabase = await createClient();
  const { data: path } = await supabase
    .from("learning_paths")
    .select("*, learning_path_courses(course_id, position, courses(slug)), bundles(id, title, slug, price, is_published, archived_at)")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!path) return null;

  const ordered = [...path.learning_path_courses].sort((a, b) => a.position - b.position);
  const outlines = (await Promise.all(ordered.map((pc) => (pc.courses ? getCourseOutline(pc.courses.slug, userId) : null)))).filter(
    (o): o is CourseOutline => o !== null,
  );
  const ids = outlines.map((o) => o.course.id);
  const [{ data: certs }, { data: projects }] = await Promise.all([
    userId && ids.length
      ? supabase.from("certificates").select("course_id, code").eq("user_id", userId).in("course_id", ids).is("revoked_at", null)
      : Promise.resolve({ data: [] as { course_id: string; code: string }[] }),
    ids.length
      ? supabase
          .from("projects")
          .select("id, title, slug, course_id")
          .in("course_id", ids)
          .eq("is_published", true)
          .is("archived_at", null)
          .order("position")
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string; course_id: string }[] }),
  ]);
  const certBy = new Map((certs ?? []).map((c) => [c.course_id, c.code]));
  const steps: PathStep[] = outlines.map((o) => ({ outline: o, certificateCode: certBy.get(o.course.id) ?? null }));

  const { bundles, ...rest } = path;
  const bundle = bundles && bundles.is_published && !bundles.archived_at ? bundles : null;
  return { path: rest, bundle, steps, projects: projects ?? [] };
}

/** Cached per request (page + metadata share one load). */
export const getPath = cache(loadPath);

export type ProjectCard = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  cover_url: string | null;
  level: CourseLevel | null;
  hours: number | null;
  skills: string[];
  course: { title: string; slug: string } | null;
};

export async function listProjects(supabase: Supabase, courseId?: string): Promise<ProjectCard[]> {
  let q = supabase
    .from("projects")
    .select("id, title, slug, short_description, cover_url, level, hours, skills, courses!inner(title, slug, is_published, archived_at)")
    .eq("is_published", true)
    .is("archived_at", null)
    .eq("courses.is_published", true)
    .is("courses.archived_at", null)
    .order("position");
  if (courseId) q = q.eq("course_id", courseId);
  const { data } = await q;
  return (data ?? []).map(({ courses, ...p }) => ({ ...p, course: courses ? { title: courses.title, slug: courses.slug } : null }));
}
