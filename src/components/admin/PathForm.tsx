"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { savePath } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields, submitWith } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { LearningPath } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.paths;
const c = uz.admin.common;

type Option = { id: string; title: string };

export function PathForm({
  path,
  courseIds: initialIds = [],
  courses,
  bundles,
}: {
  path?: LearningPath;
  courseIds?: string[];
  courses: Option[];
  bundles: Option[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePath, { status: "idle" });
  const [ids, setIds] = useState(initialIds);
  const [pick, setPick] = useState("");
  const title = new Map(courses.map((x) => [x.id, x.title]));
  const available = courses.filter((x) => !ids.includes(x.id));

  const move = (i: number, dir: -1 | 1) =>
    setIds((cur) => {
      const next = [...cur];
      const [item] = next.splice(i, 1);
      next.splice(i + dir, 0, item!);
      return next;
    });

  return (
    <form onSubmit={submitWith(action)} className="card space-y-6 p-5 sm:p-6">
      {path ? <input type="hidden" name="id" value={path.id} /> : null}
      <input type="hidden" name="course_ids" value={ids.join(",")} />
      <TitleSlugFields title={path?.title} slug={path?.slug} />
      <TextField name="short_description" label={c.shortDescription} defaultValue={path?.short_description} maxLength={300} />

      <fieldset>
        <legend className="label">{t.courses}</legend>
        {ids.length === 0 ? <p className="mb-2 text-sm text-muted">{t.noCourses}</p> : null}
        <ol className="space-y-2">
          {ids.map((id, i) => (
            <li key={id} className="flex min-h-12 items-center gap-2 rounded-lg border border-border px-3">
              <span className="w-6 text-sm font-bold text-muted">{i + 1}.</span>
              <span className="min-w-0 flex-1 font-semibold">{title.get(id) ?? id}</span>
              <button type="button" className="btn-ghost size-9 px-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${title.get(id)}: ↑`}>
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className="btn-ghost size-9 px-0" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`${title.get(id)}: ↓`}>
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className="btn-ghost size-9 px-0 text-danger" onClick={() => setIds((cur) => cur.filter((x) => x !== id))} aria-label={t.removeCourse(title.get(id) ?? "")}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        {available.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <label htmlFor="path-pick" className="sr-only">
              {t.pickCourse}
            </label>
            <select id="path-pick" className="input min-w-0 flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">{t.pickCourse}</option>
              {available.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              disabled={!pick}
              onClick={() => {
                setIds((cur) => [...cur, pick]);
                setPick("");
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t.addCourse}
            </button>
          </div>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="path-level" className="label">
            {uz.admin.courseExtra.level}
          </label>
          <select id="path-level" name="level" defaultValue={path?.level ?? ""} className="input">
            <option value="">{uz.admin.courseExtra.noLevel}</option>
            {(["beginner", "intermediate", "advanced"] as const).map((l) => (
              <option key={l} value={l}>
                {uz.coursePage.levels[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="path-bundle" className="label">
            {t.bundle}
          </label>
          <select id="path-bundle" name="bundle_id" defaultValue={path?.bundle_id ?? ""} className="input">
            <option value="">{t.noBundle}</option>
            {bundles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="path-outcomes" className="label">
          {t.outcomes}
        </label>
        <textarea id="path-outcomes" name="outcomes" rows={4} defaultValue={(path?.outcomes ?? []).join("\n")} className="input min-h-24 py-2 text-sm" />
      </div>
      <MarkdownField name="description" label={c.description} defaultValue={path?.description} rows={6} />
      <CoverField defaultValue={path?.cover_url} />
      <Checkbox name="is_published" label={c.published} defaultChecked={path?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton pending={pending} label={path ? c.save : c.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
