"use client";

import { useActionState } from "react";
import { saveCourse } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { Category, Course } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.common;

export function CourseForm({ course, categories }: { course?: Course; categories: Category[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCourse, { status: "idle" });
  return (
    <form action={action} className="card space-y-6 p-5 sm:p-6">
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
      <TextField name="short_description" label={t.shortDescription} defaultValue={course?.short_description} maxLength={300} />
      <MarkdownField name="description" label={t.description} defaultValue={course?.description} rows={8} />
      <CoverField defaultValue={course?.cover_url} />
      <Checkbox name="is_published" label={t.published} defaultChecked={course?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton label={course ? t.save : t.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
