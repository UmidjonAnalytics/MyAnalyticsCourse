import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Briefcase, CheckCircle2, Clock, ExternalLink, Lock, MessageSquareText, RotateCcw, Hourglass } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ProjectSubmitForm } from "@/components/course/ProjectSubmitForm";
import { CourseCover } from "@/components/CourseCover";
import { AssignmentsList, loadAssignments, loadMaterials, MaterialsList } from "@/components/learn/Blocks";
import { Markdown } from "@/components/Markdown";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;
const t = uz.projects;

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, courses!inner(id, title, slug, is_published, archived_at)")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!data || !data.courses?.is_published || data.courses.archived_at) return null;
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await load(slug);
  return project ? { title: project.title, description: project.short_description } : {};
}

const statusIcon = { submitted: Hourglass, approved: CheckCircle2, needs_work: RotateCcw } as const;

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await load(slug);
  if (!project) notFound();
  const course = project.courses!;

  const supabase = await createClient();
  const user = await getCurrentUser();
  const [{ data: canView }, { data: showcase }] = await Promise.all([
    user ? supabase.rpc("can_view_project", { p_project_id: project.id }) : Promise.resolve({ data: false }),
    supabase.rpc("project_showcase", { p_project_id: project.id }),
  ]);
  const access = Boolean(user && canView);

  const [materials, excel, { data: mine }] = access
    ? await Promise.all([
        loadMaterials(supabase, { projectId: project.id }),
        loadAssignments(supabase, { projectId: project.id }, user!.id),
        supabase
          .from("project_submissions")
          .select("link_url, summary, is_public, status, feedback, submitted_at, reviewed_at")
          .eq("project_id", project.id)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ])
    : [null, null, { data: null }];

  const StatusIcon = mine ? statusIcon[mine.status] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/loyihalar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.back}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <header>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Briefcase className="size-3.5" aria-hidden="true" />
              {t.title}
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{project.title}</h1>
            <p className="mt-3 text-lg text-muted">{project.short_description}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {project.level ? (
                <li className="inline-flex items-center gap-1.5">
                  <BarChart3 className="size-4" aria-hidden="true" />
                  {uz.coursePage.levels[project.level]}
                </li>
              ) : null}
              {project.hours ? (
                <li className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {t.hours(project.hours)}
                </li>
              ) : null}
              <li>
                {t.fromCourse}:{" "}
                <Link href={`/kurs/${course.slug}`} className="font-semibold text-text hover:underline">
                  {course.title}
                </Link>
              </li>
            </ul>
            {project.skills.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.skills}>
                {project.skills.map((s) => (
                  <li key={s} className="rounded-md bg-surface-muted px-2.5 py-1 text-sm font-semibold">
                    {s}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {project.brief_md ? (
            <section aria-labelledby="brief" className="card border-l-4 border-l-accent p-5 sm:p-6">
              <h2 id="brief" className="text-xl font-bold">
                {t.brief}
              </h2>
              <Markdown className="mt-3">{project.brief_md}</Markdown>
            </section>
          ) : null}

          {access ? (
            <>
              {project.steps_md ? (
                <section aria-labelledby="steps">
                  <h2 id="steps" className="text-xl font-bold">
                    {t.steps}
                  </h2>
                  <Markdown className="mt-3">{project.steps_md}</Markdown>
                </section>
              ) : null}

              {materials ? <MaterialsList {...materials} headingId="project-files" title={t.files} /> : null}
              {excel ? <AssignmentsList {...excel} title={t.checkpoint} lead={t.checkpointLead} /> : null}

              <section aria-labelledby="submit" className="card space-y-4 p-5 sm:p-6">
                <h2 id="submit" className="text-xl font-bold">
                  {mine ? t.yourSubmission : t.submitTitle}
                </h2>
                {project.deliverable_md ? (
                  <div className="rounded-lg bg-surface-muted p-4">
                    <p className="text-sm font-bold">{t.deliverable}</p>
                    <Markdown className="mt-2 text-sm">{project.deliverable_md}</Markdown>
                  </div>
                ) : null}
                {mine && StatusIcon ? (
                  <div className={`rounded-lg border p-4 ${mine.status === "approved" ? "border-accent bg-accent-soft" : mine.status === "needs_work" ? "border-danger bg-danger-soft" : "border-border"}`}>
                    <p className="flex items-center gap-2 font-semibold">
                      <StatusIcon className="size-5" aria-hidden="true" />
                      {t.status[mine.status]}
                      <span className="text-sm font-normal text-muted">· {formatDate(mine.reviewed_at ?? mine.submitted_at)}</span>
                    </p>
                    {mine.feedback ? (
                      <div className="mt-3">
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          <MessageSquareText className="size-4" aria-hidden="true" />
                          {t.feedback}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{mine.feedback}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t.submitLead}</p>
                )}
                <ProjectSubmitForm projectId={project.id} slug={project.slug} initial={mine ? { link_url: mine.link_url, summary: mine.summary, is_public: mine.is_public } : null} />
              </section>
            </>
          ) : (
            <div className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
              <Lock className="size-6 shrink-0 text-muted" aria-hidden="true" />
              <p className="flex-1">{t.locked}</p>
              {user ? (
                <Link href={`/kurs/${course.slug}`} className="btn-primary">
                  {t.buyCourse}
                </Link>
              ) : (
                <Link href={`/kirish?next=${encodeURIComponent(`/loyiha/${project.slug}`)}`} className="btn-primary">
                  {t.login}
                </Link>
              )}
            </div>
          )}

          <section aria-labelledby="showcase">
            <h2 id="showcase" className="text-xl font-bold">
              {t.showcase}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.showcaseLead}</p>
            {showcase && showcase.length > 0 ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {showcase.map((s) => (
                  <li key={s.id} className="card flex flex-col p-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.author} size={32} />
                      {s.username ? (
                        <Link href={`/u/${s.username}`} className="font-semibold hover:underline">
                          {s.author}
                        </Link>
                      ) : (
                        <span className="font-semibold">{s.author}</span>
                      )}
                    </div>
                    {s.summary ? <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap text-sm">{s.summary}</p> : <span className="flex-1" />}
                    <a href={s.link_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn-secondary mt-3 min-h-10 self-start text-sm">
                      <ExternalLink className="size-4" aria-hidden="true" />
                      {t.viewWork}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">{t.showcaseEmpty}</p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <CourseCover url={project.cover_url} label={course.title} />
            <div className="p-5 text-sm">
              <p className="text-muted">{t.fromCourse}</p>
              <Link href={`/kurs/${course.slug}`} className="mt-1 block font-bold hover:underline">
                {course.title}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
