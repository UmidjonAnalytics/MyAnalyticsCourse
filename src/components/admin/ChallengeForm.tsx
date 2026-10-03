"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";
import { saveChallenge, updateChallengeEntry } from "@/app/admin/(panel)/actions/content";
import { Checkbox, CoverField, FormMessage, MarkdownField, SubmitButton, TextField, TitleSlugFields, submitWith } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import type { FormState } from "@/lib/admin/context";
import type { Challenge } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.challenges;
const c = uz.admin.common;

/** ISO time → "YYYY-MM-DDTHH:mm" in Tashkent time (UTC+5) for <input type="datetime-local">. */
function toTashkentInput(iso: string | undefined, fallbackDays: number): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + fallbackDays * 86_400_000);
  return new Date(d.getTime() + 5 * 3_600_000).toISOString().slice(0, 16);
}

export function ChallengeForm({ challenge, datasets }: { challenge?: Challenge; datasets: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveChallenge, { status: "idle" });
  return (
    <form onSubmit={submitWith(action)} className="card space-y-6 p-5 sm:p-6">
      {challenge ? <input type="hidden" name="id" value={challenge.id} /> : null}
      <TitleSlugFields title={challenge?.title} slug={challenge?.slug} />
      <TextField name="short_description" label={c.shortDescription} defaultValue={challenge?.short_description} maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ch-starts" className="label">
            {t.startsAt}
          </label>
          <input id="ch-starts" name="starts_at" type="datetime-local" className="input" defaultValue={toTashkentInput(challenge?.starts_at, 0)} required />
        </div>
        <div>
          <label htmlFor="ch-ends" className="label">
            {t.endsAt}
          </label>
          <input id="ch-ends" name="ends_at" type="datetime-local" className="input" defaultValue={toTashkentInput(challenge?.ends_at, 30)} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="prize" label={t.prize} defaultValue={challenge?.prize} maxLength={200} />
        <div>
          <label htmlFor="ch-dataset" className="label">
            {t.dataset}
          </label>
          <select id="ch-dataset" name="dataset_id" defaultValue={challenge?.dataset_id ?? ""} className="input">
            <option value="">{t.noDataset}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <MarkdownField name="brief_md" label={t.brief} defaultValue={challenge?.brief_md} rows={8} />
      <MarkdownField name="rules_md" label={t.rules} defaultValue={challenge?.rules_md} rows={5} />
      <CoverField defaultValue={challenge?.cover_url} />
      <Checkbox name="is_published" label={c.published} defaultChecked={challenge?.is_published ?? false} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton pending={pending} label={challenge ? c.save : c.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Winner place + hide/show for one entry. */
export function EntryControls({ id, place: initialPlace, hidden }: { id: string; place: number | null; hidden: boolean }) {
  const router = useRouter();
  const [place, setPlace] = useState(initialPlace ? String(initialPlace) : "");
  const [pending, startTransition] = useTransition();
  const run = (patch: { place?: number | null; hidden?: boolean }) =>
    startTransition(async () => {
      const res = await updateChallengeEntry({ id, ...patch });
      if (res.ok) toast(res.message ?? t.saved);
      else toast(res.error, "error");
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`place-${id}`} className="text-sm font-semibold">
        {t.place}
      </label>
      <select
        id={`place-${id}`}
        className="input min-h-10 w-24 py-1"
        value={place}
        disabled={pending}
        onChange={(e) => {
          setPlace(e.target.value);
          run({ place: e.target.value ? Number(e.target.value) : null });
        }}
      >
        <option value="">{t.noPlace}</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <button type="button" className="btn-ghost min-h-10 text-sm" disabled={pending} onClick={() => run({ hidden: !hidden })}>
        {hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
        {hidden ? t.show : t.hide}
      </button>
    </div>
  );
}
