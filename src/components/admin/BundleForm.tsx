"use client";

import { useActionState, useState } from "react";
import { saveBundle } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { Bundle } from "@/lib/database.types";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin;

export function BundleForm({
  bundle,
  courses,
  selected,
}: {
  bundle?: Bundle;
  courses: Array<{ id: string; title: string; price: number }>;
  selected: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(saveBundle, { status: "idle" });
  const [picked, setPicked] = useState(new Set(selected));
  const fullPrice = courses.filter((c) => picked.has(c.id)).reduce((s, c) => s + c.price, 0);

  return (
    <form action={action} className="card space-y-6 p-5 sm:p-6">
      {bundle ? <input type="hidden" name="id" value={bundle.id} /> : null}
      <TitleSlugFields title={bundle?.title} slug={bundle?.slug} />

      <fieldset>
        <legend className="label">{t.bundles.courses}</legend>
        <p className="mb-2 text-xs text-muted">{t.bundles.coursesHint}</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {courses.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-surface-muted">
              <input
                type="checkbox"
                name="course_ids"
                value={c.id}
                checked={picked.has(c.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(c.id);
                  else next.delete(c.id);
                  setPicked(next);
                }}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="flex-1 text-sm font-semibold">{c.title}</span>
              <span className="text-xs text-muted">{formatSom(c.price)}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{t.bundles.fullPrice(formatSom(fullPrice))}</p>
      </fieldset>

      <TextField name="price" label={t.common.price} defaultValue={String(bundle?.price ?? 0)} inputMode="numeric" required />
      <Checkbox name="allow_upgrade_pricing" label={t.bundles.upgrade} defaultChecked={bundle?.allow_upgrade_pricing ?? false} />
      <TextField name="short_description" label={t.common.shortDescription} defaultValue={bundle?.short_description} maxLength={300} />
      <MarkdownField name="description" label={t.common.description} defaultValue={bundle?.description} rows={6} />
      <CoverField defaultValue={bundle?.cover_url} />
      <Checkbox name="is_published" label={t.common.published} defaultChecked={bundle?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton label={bundle ? t.common.save : t.common.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
