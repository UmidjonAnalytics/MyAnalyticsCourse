"use client";

import { useActionState, useState } from "react";
import { savePromo } from "@/app/admin/(panel)/actions/sales";
import { Checkbox, FormMessage, SubmitButton } from "@/components/admin/fields";
import type { FormState } from "@/lib/admin/context";
import type { PromoCode } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.promo;

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Tashkent" }) : "");

export function PromoForm({
  promo,
  courses,
  bundles,
}: {
  promo?: PromoCode;
  courses: Array<{ id: string; title: string }>;
  bundles: Array<{ id: string; title: string }>;
}) {
  const [state, action] = useActionState<FormState, FormData>(savePromo, { status: "idle" });
  const applies = (promo?.applies_to ?? { all: true }) as { all?: boolean; courses?: string[]; bundles?: string[] };
  const [some, setSome] = useState(!applies.all);

  return (
    <form action={action} className="card space-y-5 p-5 sm:p-6">
      {promo ? <input type="hidden" name="id" value={promo.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="label">
            {t.code}
          </label>
          <input id="code" name="code" defaultValue={promo?.code} required maxLength={40} className="input font-mono uppercase" aria-describedby="code-h" />
          <p id="code-h" className="mt-1 text-xs text-muted">
            {t.codeHint}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="discount_type" className="label">
              {t.type}
            </label>
            <select id="discount_type" name="discount_type" defaultValue={promo?.discount_type ?? "percent"} className="input">
              <option value="percent">{t.percent}</option>
              <option value="fixed">{t.fixed}</option>
            </select>
          </div>
          <div>
            <label htmlFor="discount_value" className="label">
              {t.value}
            </label>
            <input id="discount_value" name="discount_value" inputMode="numeric" defaultValue={promo?.discount_value ?? 10} required className="input" />
          </div>
        </div>
        <div>
          <label htmlFor="valid_from" className="label">
            {t.validFrom}
          </label>
          <input id="valid_from" name="valid_from" type="date" defaultValue={day(promo?.valid_from)} className="input" />
        </div>
        <div>
          <label htmlFor="valid_to" className="label">
            {t.validTo}
          </label>
          <input id="valid_to" name="valid_to" type="date" defaultValue={day(promo?.valid_to)} className="input" />
        </div>
        <div>
          <label htmlFor="usage_limit" className="label">
            {t.limit}
          </label>
          <input id="usage_limit" name="usage_limit" inputMode="numeric" defaultValue={promo?.usage_limit ?? ""} className="input" />
        </div>
      </div>

      <fieldset>
        <legend className="label">{t.appliesTo}</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="applies" value="all" checked={!some} onChange={() => setSome(false)} className="size-5 accent-[var(--accent)]" />
            {t.appliesAll}
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="applies" value="some" checked={some} onChange={() => setSome(true)} className="size-5 accent-[var(--accent)]" />
            {t.appliesSome}
          </label>
        </div>
        {some ? (
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {courses.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-muted">
                <input type="checkbox" name="course_ids" value={c.id} defaultChecked={applies.courses?.includes(c.id)} className="size-5 accent-[var(--accent)]" />
                {c.title}
              </label>
            ))}
            {bundles.map((b) => (
              <label key={b.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-muted">
                <input type="checkbox" name="bundle_ids" value={b.id} defaultChecked={applies.bundles?.includes(b.id)} className="size-5 accent-[var(--accent)]" />
                {b.title} <span className="text-xs text-muted">({uz.admin.nav.bundles})</span>
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <Checkbox name="is_active" label={t.active} defaultChecked={promo?.is_active ?? true} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <SubmitButton label={promo ? uz.admin.common.save : uz.admin.common.create} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}
