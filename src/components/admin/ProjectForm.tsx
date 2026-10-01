"use client";

import { useActionState } from "react";
import { saveProject } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { Project } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.projects;
const c = uz.admin.common;

export function ProjectForm({ project, courses }: { project?: Project; courses: { id: string; title: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProject, { status: "idle" });
  return (
    <form action={action} className="card space-y-6 p-5 sm:p-6">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <div>
        <label htmlFor="project-course" className="label">
          {t.course}
        </label>
        <select id="project-course" name="course_id" defaultValue={project?.course_id ?? ""} className="input" required>
          <option value="" disabled>
            —
          </option>
          {courses.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
      </div>
      <TitleSlugFields title={project?.title} slug={project?.slug} />
      <TextField name="short_description" label={c.shortDescription} defaultValue={project?.short_description} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="project-level" className="label">
            {uz.admin.courseExtra.level}
          </label>
          <select id="project-level" name="level" defaultValue={project?.level ?? ""} className="input">
            <option value="">{uz.admin.courseExtra.noLevel}</option>
            {(["beginner", "intermediate", "advanced"] as const).map((l) => (
              <option key={l} value={l}>
                {uz.coursePage.levels[l]}
              </option>
            ))}
          </select>
        </div>
        <TextField name="hours" label={t.hours} defaultValue={project?.hours != null ? String(project.hours) : ""} inputMode="numeric" />
      </div>
      <div>
        <label htmlFor="project-skills" className="label">
          {t.skills}
        </label>
        <textarea id="project-skills" name="skills" rows={3} defaultValue={(project?.skills ?? []).join("\n")} className="input min-h-20 py-2 text-sm" />
      </div>
      <MarkdownField name="brief_md" label={t.brief} defaultValue={project?.brief_md} rows={8} />
      <MarkdownField name="steps_md" label={t.steps} defaultValue={project?.steps_md} rows={8} />
      <MarkdownField name="deliverable_md" label={t.deliverable} defaultValue={project?.deliverable_md} rows={4} />
      <CoverField defaultValue={project?.cover_url} />
      <Checkbox name="is_published" label={c.published} defaultChecked={project?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton label={project ? c.save : c.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
