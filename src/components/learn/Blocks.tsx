import "server-only";
import { Download, ExternalLink, FileSpreadsheet, Paperclip } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { AssignmentPanel, type AssignmentAttempt } from "@/components/learn/AssignmentPanel";
import { officeViewerUrl } from "@/lib/embed";
import { uz } from "@/lib/i18n/uz";
import { formatSize, resourceLinks, workbookLinks } from "@/lib/storage-links";
import type { createClient } from "@/lib/supabase/server";

// Shared by lesson pages and project pages: downloadable materials and Excel assignments.
// RLS decides what comes back, so callers only render what the student may open.

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type Owner = { lessonId: string } | { projectId: string };
const ownerColumn = (o: Owner) => ("lessonId" in o ? (["lesson_id", o.lessonId] as const) : (["project_id", o.projectId] as const));

export async function loadMaterials(supabase: Supabase, owner: Owner) {
  const [col, id] = ownerColumn(owner);
  const { data } = await supabase.from("lesson_resources").select("id, title, file_path, url, size_bytes").eq(col, id).order("position");
  const resources = data ?? [];
  return { resources, urls: await resourceLinks(resources) };
}

export function MaterialsList({
  resources,
  urls,
  headingId = "resources",
  title = uz.resources.title,
}: Awaited<ReturnType<typeof loadMaterials>> & { headingId?: string; title?: string }) {
  if (resources.length === 0) return null;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-bold">
        <Paperclip className="size-5 text-accent-text" aria-hidden="true" />
        {title}
      </h2>
      <ul className="card mt-3 divide-y divide-border">
        {resources.map((r, i) => {
          const href = r.url ?? urls[i];
          if (!href) return null;
          return (
            <li key={r.id}>
              <a
                href={href}
                {...(r.url ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
              >
                {r.url ? (
                  <ExternalLink className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                ) : (
                  <Download className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 font-semibold">{r.title}</span>
                <span className="shrink-0 text-xs text-muted">{r.url ? uz.resources.open : formatSize(r.size_bytes) || uz.resources.download}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export async function loadAssignments(supabase: Supabase, owner: Owner, userId: string) {
  const [col, id] = ownerColumn(owner);
  const { data } = await supabase
    .from("assignments")
    .select("id, title, instructions_md, embed_url, file_path, allow_download, points, assignment_questions(id, prompt, answer_type, placeholder, position)")
    .eq(col, id)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("position");
  const assignments = data ?? [];
  const ids = assignments.map((a) => a.id);
  const [{ data: subs }, links] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("assignment_submissions")
          .select("id, assignment_id, answers, correct, total, passed, created_at")
          .eq("user_id", userId)
          .in("assignment_id", ids)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as { id: string; assignment_id: string; answers: unknown; correct: number; total: number; passed: boolean; created_at: string }[] }),
    Promise.all(assignments.map((a) => (a.file_path ? workbookLinks(a.file_path, a.title) : Promise.resolve(null)))),
  ]);
  return { assignments, subs: subs ?? [], links };
}

export function AssignmentsList({
  assignments,
  subs,
  links,
  title = uz.assignment.title,
  lead,
}: Awaited<ReturnType<typeof loadAssignments>> & { title?: string; lead?: string }) {
  if (assignments.length === 0) return null;
  return (
    <section aria-labelledby="excel-tasks" className="space-y-4">
      <div>
        <h2 id="excel-tasks" className="flex items-center gap-2 text-xl font-bold">
          <FileSpreadsheet className="size-5 text-accent-text" aria-hidden="true" />
          {title}
        </h2>
        {lead ? <p className="mt-1 text-sm text-muted">{lead}</p> : null}
      </div>
      {assignments.map((a, i) => {
        const link = links[i];
        const embedSrc = a.embed_url ?? (link?.view ? officeViewerUrl(link.view) : null);
        const openHref = a.embed_url ?? (link?.view ? officeViewerUrl(link.view).replace("/op/embed.aspx", "/op/view.aspx") : null);
        return (
          <AssignmentPanel
            key={a.id}
            assignmentId={a.id}
            number={i + 1}
            title={a.title}
            points={a.points}
            instructions={a.instructions_md ? <Markdown>{a.instructions_md}</Markdown> : null}
            embedSrc={embedSrc}
            openHref={openHref}
            downloadHref={a.allow_download ? (link?.download ?? null) : null}
            questions={[...a.assignment_questions]
              .sort((x, y) => x.position - y.position)
              .map((q) => ({ id: q.id, prompt: q.prompt, answer_type: q.answer_type, placeholder: q.placeholder }))}
            attempts={subs
              .filter((s) => s.assignment_id === a.id)
              .map(
                (s): AssignmentAttempt => ({
                  id: s.id,
                  correct: s.correct,
                  total: s.total,
                  passed: s.passed,
                  created_at: s.created_at,
                  answers: (s.answers ?? {}) as Record<string, string>,
                }),
              )}
          />
        );
      })}
    </section>
  );
}
