"use client";

import { useActionState } from "react";
import { saveCourse } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SaleFields, SubmitButton, TextField, TitleSlugFields, submitWith } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { Category, Course, Instructor } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.common;
const x = uz.admin.courseExtra;

function LinesField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string[] }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={4}
        defaultValue={(defaultValue ?? []).join("\n")}
        aria-describedby="lines-hint"
        className="input min-h-24 py-2 text-sm"
      />
    </div>
  );
}

export function CourseForm({
  course,
  categories,
  instructors = [],
}: {
  course?: Course;
  categories: Category[];
  instructors?: Pick<Instructor, "id" | "name">[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCourse, { status: "idle" });
  return (
    <form onSubmit={submitWith(action)} className="card space-y-6 p-5 sm:p-6">
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <TitleSlugFields title={course?.title} slug={course?.slug} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category_id" className="label">
            {t.category}
          </label>
          <select id="category_id" name="category_id" defaultValue={course?.category_id ?? ""} className="input">
            <option value="">{t.noCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <TextField name="price" label={t.price} defaultValue={String(course?.price ?? 0)} inputMode="numeric" required />
      </div>
      <SaleFields price={course?.sale_price} endsAt={course?.sale_ends_at} />
      <TextField name="short_description" label={t.shortDescription} defaultValue={course?.short_description} maxLength={300} />
      <MarkdownField name="description" label={t.description} defaultValue={course?.description} rows={8} />
      <CoverField defaultValue={course?.cover_url} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="level" className="label">
            {x.level}
          </label>
          <select id="level" name="level" defaultValue={course?.level ?? ""} className="input">
            <option value="">{x.noLevel}</option>
            {(["beginner", "intermediate", "advanced"] as const).map((l) => (
              <option key={l} value={l}>
                {uz.coursePage.levels[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instructor_id" className="label">
            {x.instructor}
          </label>
          <select id="instructor_id" name="instructor_id" defaultValue={course?.instructor_id ?? ""} className="input">
            <option value="">{uz.admin.instructors.none}</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <LinesField name="outcomes" label={x.outcomes} defaultValue={course?.outcomes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <LinesField name="audience" label={x.audience} defaultValue={course?.audience} />
        <LinesField name="requirements" label={x.requirements} defaultValue={course?.requirements} />
      </div>
      <p id="lines-hint" className="-mt-3 text-xs text-muted">
        {x.linesHint}
      </p>
      <Checkbox name="is_published" label={t.published} defaultChecked={course?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton pending={pending} label={course ? t.save : t.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
