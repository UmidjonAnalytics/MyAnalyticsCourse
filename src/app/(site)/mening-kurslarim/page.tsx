import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, Briefcase, CheckCircle2, Clock, Flame, PlayCircle, Route, Trophy } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Notice } from "@/components/Notice";
import { requireUser } from "@/lib/auth/session";
import { getCourseOutline, getOwnedCourseIds } from "@/lib/data/catalog";
import { getDashboard } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/format";
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

  const t = uz.myCourses;
  const ownedIds = [...owned];
  const [dash, { data: projects }, { data: submitted }, { count: pathCount }, { data: challenge }] = await Promise.all([
    getDashboard(supabase, user.id, owned),
    ownedIds.length
      ? supabase.from("projects").select("id, title, slug").in("course_id", ownedIds).eq("is_published", true).is("archived_at", null).order("position")
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
    supabase.from("project_submissions").select("project_id").eq("user_id", user.id),
    supabase.from("learning_paths").select("id", { count: "exact", head: true }).eq("is_published", true).is("archived_at", null),
    supabase
      .from("challenges")
      .select("title, slug")
      .eq("is_published", true)
      .is("archived_at", null)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .limit(1)
      .maybeSingle(),
  ]);
  const doneProjects = new Set((submitted ?? []).map((x) => x.project_id));
  const pendingProject = (projects ?? []).find((p) => !doneProjects.has(p.id)) ?? null;
  const continueOutline = dash.continueAt ? outlines.find((o) => o.course.slug === dash.continueAt!.courseSlug) : null;
  const maxWeek = Math.max(1, ...dash.activity.map((a) => a.count));
  const tiles = [
    { Icon: CheckCircle2, label: t.lessonsDone, value: String(dash.lessonsDone) },
    { Icon: Clock, label: t.hoursLearned, value: t.hours(dash.minutesLearned) },
    { Icon: Flame, label: t.streak, value: t.streakValue(dash.streak), hint: t.streakHint },
    { Icon: Award, label: t.certificates, value: String(certBy.size) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold">{t.hello(user.profile?.full_name ?? "")}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>

      {outlines.length > 0 ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {dash.continueAt ? (
            <section aria-labelledby="continue" className="card flex flex-col justify-between gap-4 border-accent p-5 sm:p-6">
              <div>
                <h2 id="continue" className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                  <PlayCircle className="size-4" aria-hidden="true" />
                  {t.continueTitle}
                </h2>
                <p className="mt-2 text-sm text-muted">{dash.continueAt.courseTitle}</p>
                <p className="text-xl font-bold">{dash.continueAt.lessonTitle}</p>
                {continueOutline ? (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted">
                      <span>{uz.course.progress(continueOutline.completed, continueOutline.total)}</span>
                      <span>{continueOutline.percent}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${continueOutline.percent}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
              <Link href={`/dars/${dash.continueAt.courseSlug}/${dash.continueAt.lessonSlug}`} className="btn-primary self-start">
                {t.continueLesson}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="next-step" className="card p-5 sm:p-6">
            <h2 id="next-step" className="text-sm font-semibold text-muted">
              {t.nextStep}
            </h2>
            {pendingProject ? (
              <div className="mt-2 space-y-3">
                <p className="flex items-start gap-2 font-semibold">
                  <Briefcase className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  {t.pendingProject(pendingProject.title)}
                </p>
                <Link href={`/loyiha/${pendingProject.slug}`} className="btn-secondary">
                  {t.openProject}
                </Link>
              </div>
            ) : challenge ? (
              <div className="mt-2 space-y-3">
                <p className="flex items-start gap-2 font-semibold">
                  <Trophy className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  {t.tryChallenge}: {challenge.title}
                </p>
                <Link href={`/challenge/${challenge.slug}`} className="btn-secondary">
                  {uz.challenge.submitTitle}
                </Link>
              </div>
            ) : pathCount ? (
              <div className="mt-2 space-y-3">
                <p className="flex items-start gap-2 font-semibold">
                  <Route className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  {t.tryPath}
                </p>
                <p className="text-sm text-muted">{t.tryPathText}</p>
                <Link href="/yollar" className="btn-secondary">
                  {uz.nav.paths}
                </Link>
              </div>
            ) : (
              <Link href="/#kurslar" className="btn-secondary mt-3">
                {t.toCatalog}
              </Link>
            )}
          </section>
        </div>
      ) : null}

      {outlines.length > 0 ? (
        <section aria-labelledby="stats" className="mt-6">
          <h2 id="stats" className="sr-only">
            {t.stats}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map(({ Icon, label, value, hint }) => (
              <li key={label} className="card p-5">
                <span className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </span>
                <span className="mt-2 block font-display text-2xl font-bold">{value}</span>
                {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
              </li>
            ))}
          </ul>
          <div className="card mt-4 p-5">
            <h3 className="text-sm font-semibold text-muted">{t.activity}</h3>
            <ol className="mt-3 flex items-end gap-1.5" aria-label={t.activity}>
              {dash.activity.map((w) => {
                const level = w.count === 0 ? 0 : Math.ceil((w.count / maxWeek) * 4);
                const label = t.activityWeek(formatDate(new Date(w.weekStart + 5 * 3_600_000).toISOString()), w.count);
                return (
                  <li key={w.weekStart} className="flex-1" title={label}>
                    <span className="sr-only">{label}</span>
                    <span
                      aria-hidden="true"
                      className={`block h-8 rounded ${level === 0 ? "bg-surface-muted" : "bg-accent"}`}
                      style={level ? { opacity: 0.25 + level * 0.1875 } : undefined}
                    />
                  </li>
                );
              })}
            </ol>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted" aria-hidden="true">
              {t.less}
              <span className="size-3 rounded-sm bg-surface-muted" />
              <span className="size-3 rounded-sm bg-accent opacity-40" />
              <span className="size-3 rounded-sm bg-accent opacity-70" />
              <span className="size-3 rounded-sm bg-accent" />
              {t.more}
            </div>
          </div>
        </section>
      ) : null}

      <h2 className="mt-10 text-xl font-bold">{t.allCourses}</h2>

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
