"use client";

import { useActionState } from "react";
import { saveLesson } from "@/app/admin/(panel)/actions/content";
import { Checkbox, FormMessage, MarkdownField, SubmitButton, TitleSlugFields, YouTubeField } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { Lesson, LessonContent } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.lesson;

export function LessonForm({
  lesson,
  content,
  modules,
}: {
  lesson: Lesson;
  content: LessonContent | null;
  modules: Array<{ id: string; title: string }>;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveLesson, { status: "idle" });
  return (
    <form action={action} className="card space-y-6 p-5 sm:p-6">
      <input type="hidden" name="id" value={lesson.id} />
      <TitleSlugFields title={lesson.title} slug={lesson.slug} />
      <div>
        <label htmlFor="module_id" className="label">
          {t.module}
        </label>
        <select id="module_id" name="module_id" defaultValue={lesson.module_id} className="input">
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      <YouTubeField defaultValue={content?.youtube_url} />
      <div className="max-w-48">
        <label htmlFor="duration_minutes" className="label">
          {t.duration}
        </label>
        <input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          min={0}
          max={600}
          inputMode="numeric"
          defaultValue={lesson.duration_minutes ?? ""}
          className="input"
        />
      </div>
      <MarkdownField name="content_md" label={t.content} defaultValue={content?.content_md} rows={12} />
      <MarkdownField name="task_md" label={t.task} defaultValue={content?.task_md} rows={6} hint={t.taskHint} />
      <div className="flex flex-wrap gap-x-8">
        <Checkbox name="is_free_preview" label={t.freePreview} defaultChecked={lesson.is_free_preview} />
        <Checkbox name="is_published" label={t.published} defaultChecked={lesson.is_published} />
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
