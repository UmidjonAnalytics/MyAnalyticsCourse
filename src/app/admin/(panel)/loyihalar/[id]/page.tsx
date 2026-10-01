import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteProject } from "@/app/admin/(panel)/actions/content";
import { AddAssignmentButton } from "@/components/admin/AddAssignmentButton";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { SubmissionReview } from "@/components/admin/SubmissionReview";
import { publicSiteUrl } from "@/lib/admin/links";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.projects.edit };

const statusTone = { submitted: "bg-warning-soft", approved: "bg-accent-soft text-accent-text", needs_work: "bg-danger-soft" } as const;

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: courses }, { data: resources }, { data: checkpoints }, { data: submissions }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("courses").select("id, title").is("archived_at", null).order("position"),
    supabase.from("lesson_resources").select("id, title, file_path, url, size_bytes").eq("project_id", id).order("position"),
    supabase.from("assignments").select("id, title, is_published").eq("project_id", id).is("archived_at", null).order("position"),
    supabase
      .from("project_submissions")
      .select("id, link_url, summary, status, feedback, submitted_at, is_public, profiles(full_name, phone)")
      .eq("project_id", id)
      .order("submitted_at", { ascending: false }),
  ]);
  if (!project) notFound();
  const site = await publicSiteUrl();
  const t = uz.admin.projects;
  const order = { submitted: 0, needs_work: 1, approved: 2 } as const;
  const sorted = [...(submissions ?? [])].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="max-w-5xl">
      <Link href="/loyihalar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {site && project.is_published ? (
            <a href={`${site}/loyiha/${project.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-text hover:underline">
              {site.replace(/^https?:\/\//, "")}/loyiha/{project.slug}
            </a>
          ) : null}
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteProject.bind(null, project.id)} className="btn-danger" danger />
      </div>

      <section className="card mb-6 p-5 sm:p-6" aria-labelledby="submissions">
        <h2 id="submissions" className="text-lg font-bold">
          {t.submissions} <span className="text-sm font-normal text-muted">({submissions?.length ?? 0})</span>
        </h2>
        {sorted.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t.noSubmissions}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sorted.map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold">{s.profiles?.full_name || (s.profiles?.phone ? `+${s.profiles.phone}` : "—")}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[s.status]}`}>{uz.projects.status[s.status]}</span>
                  <time dateTime={s.submitted_at} className="text-muted">
                    {formatDateTime(s.submitted_at)}
                  </time>
                </div>
                <a href={s.link_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-accent-text hover:underline">
                  <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                  {s.link_url}
                </a>
                {s.summary ? <p className="mt-2 whitespace-pre-wrap text-sm">{s.summary}</p> : null}
                <div className="mt-3">
                  <SubmissionReview id={s.id} feedback={s.feedback} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectForm project={project} courses={courses ?? []} />

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="project-files">
        <h2 id="project-files" className="mb-3 text-lg font-bold">
          {t.files}
        </h2>
        <ResourceManager owner={{ projectId: project.id }} resources={resources ?? []} />
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="project-checkpoints">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="project-checkpoints" className="text-lg font-bold">
              {t.checkpoints}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.checkpointsLead}</p>
          </div>
          <AddAssignmentButton owner={{ projectId: project.id }} label={t.addCheckpoint} />
        </div>
        {checkpoints?.length ? (
          <ul className="mt-3 divide-y divide-border">
            {checkpoints.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/topshiriqlar/${a.id}`} className="font-semibold hover:underline">
                  {a.title}
                </Link>
                <span className={`text-xs font-semibold ${a.is_published ? "text-accent-text" : "text-muted"}`}>
                  {a.is_published ? uz.admin.common.published : uz.admin.common.draft}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
