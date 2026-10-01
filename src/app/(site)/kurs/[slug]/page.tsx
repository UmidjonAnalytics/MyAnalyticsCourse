/* eslint-disable @next/next/no-img-element -- instructor photos are external URLs; plain <img> keeps hosting portable */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Briefcase,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Download,
  FileSpreadsheet,
  Infinity as InfinityIcon,
  ListChecks,
  Lock,
  Paperclip,
  PlayCircle,
  Star,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CertificateButton } from "@/components/course/CertificateButton";
import { ReviewForm } from "@/components/course/ReviewForm";
import { CourseCover } from "@/components/CourseCover";
import { Markdown } from "@/components/Markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { ProjectCardView } from "@/components/catalog/Cards";
import { getBundlesForCourse, getCourseOutline, type OutlineLesson } from "@/lib/data/catalog";
import { listProjects } from "@/lib/data/paths";
import { formatDate, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;
const p = uz.coursePage;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const outline = await getCourseOutline(slug, (await getCurrentUser())?.id ?? null);
  return outline ? { title: outline.course.title, description: outline.course.short_description } : {};
}

function LessonIcon({ lesson }: { lesson: OutlineLesson }) {
  if (lesson.state === "locked") return <Lock className="size-4 shrink-0 text-muted" aria-label={uz.lesson.stateLocked} />;
  if (lesson.state === "completed") return <CheckCircle2 className="size-4 shrink-0 text-accent-text" aria-label={uz.lesson.stateCompleted} />;
  if (lesson.state === "current") return <PlayCircle className="size-4 shrink-0 text-accent-text" aria-label={uz.lesson.stateCurrent} />;
  return <Circle className="size-4 shrink-0 text-muted" aria-label={uz.lesson.stateOpen} />;
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-star text-star" : "text-border-strong"}`} />
      ))}
    </span>
  );
}

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const outline = await getCourseOutline(slug, user?.id ?? null);
  if (!outline) notFound();

  const { course, modules, hasAccess, owned, total, completed, percent, next } = outline;
  const supabase = await createClient();
  const [bundles, { data: features }, { data: reviews }, { data: instructor }, { data: myReview }, { data: myCert }, projects] = await Promise.all([
    getBundlesForCourse(supabase, course.id),
    supabase.rpc("course_lesson_features", { p_course_id: course.id }),
    supabase.rpc("course_reviews_public", { p_course_id: course.id }),
    course.instructor_id
      ? supabase.from("instructors").select("name, title, bio_md, photo_url").eq("id", course.instructor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("course_reviews").select("rating, body, hidden_at").eq("course_id", course.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("certificates").select("code").eq("course_id", course.id).eq("user_id", user.id).is("revoked_at", null).maybeSingle()
      : Promise.resolve({ data: null }),
    listProjects(supabase, course.id),
  ]);

  const lessonHref = (l: OutlineLesson) => `/dars/${course.slug}/${l.slug}`;
  const featureBy = new Map((features ?? []).map((f) => [f.lesson_id, f]));
  const sum = (k: "quiz_questions" | "exercises" | "assignments" | "resources") => (features ?? []).reduce((a, f) => a + f[k], 0);
  const quizCount = (features ?? []).filter((f) => f.quiz_questions > 0).length;
  const totalMinutes = outline.lessons.reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
  const reviewList = reviews ?? [];
  const avg = reviewList.length ? reviewList.reduce((a, r) => a + r.rating, 0) / reviewList.length : 0;
  const hasAccessNow = owned || hasAccess;

  const includes = [
    { Icon: Video, text: p.incLessons(total), show: total > 0 },
    { Icon: Clock, text: p.incLength(totalMinutes), show: totalMinutes > 0 },
    { Icon: FileSpreadsheet, text: p.incAssignments(sum("assignments")), show: sum("assignments") > 0 },
    { Icon: Code2, text: p.incExercises(sum("exercises")), show: sum("exercises") > 0 },
    { Icon: ListChecks, text: p.incQuizzes(quizCount), show: quizCount > 0 },
    { Icon: Download, text: p.incResources(sum("resources")), show: sum("resources") > 0 },
    { Icon: Briefcase, text: uz.paths.projects(projects.length), show: projects.length > 0 },
    { Icon: Award, text: p.incCertificate, show: true },
    { Icon: InfinityIcon, text: p.incLifetime, show: true },
  ].filter((x) => x.show);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/#kurslar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.course.back}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          {/* Hero */}
          <header>
            {course.categoryName ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{course.categoryName}</p> : null}
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-3 text-lg text-muted">{course.short_description}</p>
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {reviewList.length > 0 ? (
                <li className="flex items-center gap-1.5">
                  <span className="font-bold">{avg.toFixed(1)}</span>
                  <Stars value={avg} />
                  <a href="#reviews" className="text-muted underline-offset-2 hover:underline">
                    ({reviewList.length})
                  </a>
                </li>
              ) : null}
              {course.level ? (
                <li className="flex items-center gap-1.5 text-muted">
                  <BarChart3 className="size-4" aria-hidden="true" />
                  <span className="sr-only">{p.level}: </span>
                  {p.levels[course.level]}
                </li>
              ) : null}
              <li className="flex items-center gap-1.5 text-muted">
                <Video className="size-4" aria-hidden="true" />
                {uz.course.modulesCount(modules.length)} · {uz.course.lessonsCount(total)}
              </li>
              {totalMinutes > 0 ? (
                <li className="flex items-center gap-1.5 text-muted">
                  <Clock className="size-4" aria-hidden="true" />
                  {p.totalLength(totalMinutes)}
                </li>
              ) : null}
              {instructor ? (
                <li className="text-muted">
                  {p.instructor}:{" "}
                  <a href="#instructor" className="font-semibold text-text hover:underline">
                    {instructor.name}
                  </a>
                </li>
              ) : null}
            </ul>
          </header>

          {course.outcomes.length > 0 ? (
            <section aria-labelledby="outcomes" className="card p-5 sm:p-6">
              <h2 id="outcomes" className="text-xl font-bold">
                {p.outcomes}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.description ? (
            <section aria-labelledby="about">
              <h2 id="about" className="text-xl font-bold">
                {uz.course.about}
              </h2>
              <Markdown className="mt-3">{course.description}</Markdown>
            </section>
          ) : null}

          <section aria-labelledby="syllabus">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="syllabus" className="text-xl font-bold">
                {uz.course.syllabus}
              </h2>
              <p className="text-sm text-muted">
                {uz.course.modulesCount(modules.length)} · {uz.course.lessonsCount(total)}
                {totalMinutes > 0 ? ` · ${p.totalLength(totalMinutes)}` : ""}
              </p>
            </div>
            {modules.length === 0 ? <p className="mt-3 text-muted">{uz.course.noLessons}</p> : null}
            <div className="mt-4 space-y-3">
              {modules.map((m, mi) => {
                const minutes = m.lessons.reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
                return (
                  <details key={m.id} className="card group overflow-hidden" open={mi === 0 || m.lessons.some((l) => l.state === "current")}>
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 bg-surface-muted px-5 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">
                        ›
                      </span>
                      <span className="flex-1 font-bold">{m.title}</span>
                      <span className="shrink-0 text-sm text-muted">{p.moduleMeta(m.lessons.length, minutes)}</span>
                    </summary>
                    <ul className="divide-y divide-border">
                      {m.lessons.map((l) => {
                        const f = featureBy.get(l.id);
                        const inner = (
                          <>
                            <LessonIcon lesson={l} />
                            <span className="min-w-0 flex-1">{l.title}</span>
                            <span className="flex shrink-0 items-center gap-2 text-muted">
                              {f?.quiz_questions ? <ListChecks className="size-4" aria-label={p.hasQuiz} role="img" /> : null}
                              {f && f.exercises + f.assignments > 0 ? <Code2 className="size-4" aria-label={p.hasPractice} role="img" /> : null}
                              {f?.resources ? <Paperclip className="size-4" aria-label={p.hasResources} role="img" /> : null}
                              {l.is_free_preview && !hasAccess ? (
                                <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{uz.course.freePreview}</span>
                              ) : null}
                              {l.duration_minutes ? <span className="w-14 text-right text-xs tabular-nums">{uz.topbar.minutes(l.duration_minutes)}</span> : null}
                            </span>
                          </>
                        );
                        return (
                          <li key={l.id}>
                            {l.state !== "locked" ? (
                              <Link href={lessonHref(l)} className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-surface-muted">
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex min-h-12 items-center gap-3 px-5 py-2 text-muted">{inner}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>

          {projects.length > 0 ? (
            <section aria-labelledby="course-projects">
              <h2 id="course-projects" className="text-xl font-bold">
                {uz.projects.inCourse}
              </h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2">
                {projects.map((pr) => (
                  <ProjectCardView key={pr.id} p={pr} />
                ))}
              </ul>
            </section>
          ) : null}

          {course.audience.length > 0 || course.requirements.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {course.audience.length > 0 ? (
                <section aria-labelledby="audience">
                  <h2 id="audience" className="text-xl font-bold">
                    {p.audience}
                  </h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5">
                    {course.audience.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {course.requirements.length > 0 ? (
                <section aria-labelledby="requirements">
                  <h2 id="requirements" className="text-xl font-bold">
                    {p.requirements}
                  </h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5">
                    {course.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {instructor ? (
            <section aria-labelledby="instructor" className="card p-5 sm:p-6">
              <h2 id="instructor" className="text-xl font-bold">
                {p.instructor}
              </h2>
              <div className="mt-4 flex items-start gap-4">
                {instructor.photo_url ? (
                  <img src={instructor.photo_url} alt="" className="size-20 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Avatar name={instructor.name} size={80} />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold">{instructor.name}</p>
                  {instructor.title ? <p className="text-sm text-muted">{instructor.title}</p> : null}
                </div>
              </div>
              {instructor.bio_md ? <Markdown className="mt-4">{instructor.bio_md}</Markdown> : null}
            </section>
          ) : null}

          <section aria-labelledby="reviews-title" id="reviews" className="scroll-mt-6">
            <h2 id="reviews-title" className="text-xl font-bold">
              {uz.reviews.title}
            </h2>
            {reviewList.length > 0 ? (
              <div className="mt-4 grid gap-6 sm:grid-cols-[200px_1fr]">
                <div>
                  <p className="font-display text-5xl font-bold">{avg.toFixed(1)}</p>
                  <Stars value={avg} size="size-5" />
                  <p className="mt-1 text-sm text-muted">{uz.reviews.average(avg.toFixed(1), reviewList.length)}</p>
                </div>
                <ul className="space-y-1.5" aria-label={uz.reviews.rating}>
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = reviewList.filter((r) => r.rating === n).length;
                    const w = Math.round((c / reviewList.length) * 100);
                    return (
                      <li key={n} className="flex items-center gap-3 text-sm">
                        <span className="w-16 shrink-0 text-muted">{uz.reviews.stars(n)}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                          <span className="block h-full rounded-full bg-star" style={{ width: `${w}%` }} />
                        </span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-muted">{w}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-muted">{uz.reviews.none}</p>
            )}

            {reviewList.length > 0 ? (
              <ul className="mt-6 space-y-4">
                {reviewList.slice(0, 20).map((r) => (
                  <li key={r.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Avatar name={r.author} size={32} />
                      <span className="font-semibold">{r.author}</span>
                      <Stars value={r.rating} />
                      <span className="sr-only">{uz.reviews.stars(r.rating)}</span>
                      <time dateTime={r.created_at} className="text-sm text-muted">
                        {formatDate(r.created_at)}
                      </time>
                    </div>
                    {r.body ? <p className="mt-2 whitespace-pre-wrap break-words">{r.body}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {user && owned ? (
              <div className="mt-6">
                <ReviewForm
                  courseId={course.id}
                  courseSlug={course.slug}
                  initial={myReview ? { rating: myReview.rating, body: myReview.body, hidden: Boolean(myReview.hidden_at) } : null}
                />
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <CourseCover url={course.cover_url} label={course.categoryName ?? course.title} />
            <div className="space-y-4 p-5">
              {hasAccessNow ? (
                <>
                  <p className="flex items-center gap-2 font-semibold text-accent-text">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    {uz.course.owned}
                  </p>
                  <div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>{uz.course.progress(completed, total)}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  {myCert ? (
                    <Link href={`/sertifikat/${myCert.code}`} className="btn-primary w-full">
                      <Award className="size-4" aria-hidden="true" />
                      {uz.certificate.view}
                    </Link>
                  ) : total > 0 && completed === total ? (
                    <CertificateButton courseId={course.id} />
                  ) : null}
                  {next && !(myCert || (total > 0 && completed === total)) ? (
                    <Link href={lessonHref(next)} className="btn-primary w-full">
                      {completed > 0 ? uz.course.continue : uz.course.start}
                    </Link>
                  ) : null}
                  {!myCert && completed < total ? <p className="text-xs text-muted">{uz.certificate.finishFirst}</p> : null}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-bold">{formatSom(course.price)}</p>
                  <p className="text-sm text-muted">{uz.course.oneTime}</p>
                  <Link href={`/tolov/kurs/${course.slug}`} className="btn-primary w-full">
                    {uz.course.buy}
                  </Link>
                  {!user && outline.lessons.some((l) => l.is_free_preview) ? <p className="text-sm text-muted">{uz.course.loginToWatch}</p> : null}
                </>
              )}
              <div className="border-t border-border pt-4">
                <h2 className="text-sm font-bold">{p.includes}</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {includes.map(({ Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {bundles.length > 0 && !owned ? (
            <div className="card p-5">
              <h2 className="font-bold">{uz.course.inBundles}</h2>
              <p className="mt-1 text-sm text-muted">{uz.course.inBundlesLead}</p>
              <ul className="mt-3 space-y-3">
                {bundles.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/toplam/${b.slug}`}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-surface-muted"
                    >
                      <span className="font-semibold">{b.title}</span>
                      <span className="shrink-0 text-sm font-bold">{formatSom(b.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
