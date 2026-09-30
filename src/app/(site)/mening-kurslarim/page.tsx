import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Notice } from "@/components/Notice";
import { requireUser } from "@/lib/auth/session";
import { getCourseOutline, getOwnedCourseIds } from "@/lib/data/catalog";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.myCourses.title };

export default async function MyCoursesPage() {
  const user = await requireUser("/mening-kurslarim");
  const supabase = await createClient();
  const owned = await getOwnedCourseIds(supabase, user.id);

  const { data: courses, error } = await supabase
    .from("courses")
    .select("slug, position")
    .in("id", [...owned])
    .eq("is_published", true)
    .is("archived_at", null)
    .order("position");

  const { data: certs } = await supabase.from("certificates").select("course_id, code").eq("user_id", user.id).is("revoked_at", null);
  const certBy = new Map((certs ?? []).map((c) => [c.course_id, c.code]));

  const outlines = (await Promise.all((courses ?? []).map((c) => getCourseOutline(c.slug, user.id)))).filter(
    (o): o is NonNullable<typeof o> => o !== null,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold">{uz.myCourses.title}</h1>

      {error ? (
        <div className="mt-6">
          <Notice tone="error">{uz.errors.generic}</Notice>
        </div>
      ) : outlines.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center px-6 py-14 text-center">
          <BookOpen className="size-10 text-muted" aria-hidden="true" />
          <p className="mt-3 text-muted">{uz.myCourses.empty}</p>
          <Link href="/#kurslar" className="btn-primary mt-6">
            {uz.myCourses.toCatalog}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outlines.map(({ course, percent, completed, total, next }) => (
            <li key={course.id} className="card flex flex-col overflow-hidden">
              <CourseCover url={course.cover_url} label={course.categoryName ?? course.title} />
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-bold">
                  <Link href={`/kurs/${course.slug}`} className="hover:underline">
                    {course.title}
                  </Link>
                </h2>
                <div className="mt-auto pt-5">
                  <div className="flex justify-between text-sm text-muted">
                    <span>{uz.myCourses.progress(percent)}</span>
                    <span>
                      {completed}/{total}
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={uz.lesson.progressLabel}
                  >
                    <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                  </div>
                  {certBy.has(course.id) ? (
                    <Link href={`/sertifikat/${certBy.get(course.id)}`} className="btn-primary mt-4 w-full">
                      <Award className="size-4" aria-hidden="true" />
                      {uz.certificate.view}
                    </Link>
                  ) : percent === 100 ? (
                    <Link href={`/kurs/${course.slug}`} className="btn-primary mt-4 w-full">
                      <Award className="size-4" aria-hidden="true" />
                      {uz.certificate.get}
                    </Link>
                  ) : next ? (
                    <Link href={`/dars/${course.slug}/${next.slug}`} className="btn-primary mt-4 w-full">
                      {completed > 0 ? uz.myCourses.continue : uz.myCourses.start}
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
