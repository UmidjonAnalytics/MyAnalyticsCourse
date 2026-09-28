import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { archivePromo } from "@/app/admin/(panel)/actions/sales";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatDate, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.promo.title };

export default async function Promos() {
  const supabase = await createClient();
  const { data } = await supabase.from("promo_codes").select("*").is("archived_at", null).order("created_at", { ascending: false });
  const t = uz.admin.promo;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/promo/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.new}
        </Link>
      </div>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
            <Link href={`/promo/${p.id}`} className="font-mono font-bold hover:underline">
              {p.code}
            </Link>
            <span className="text-sm">{p.discount_type === "percent" ? `${p.discount_value}%` : formatSom(p.discount_value)}</span>
            <span className="flex-1 text-xs text-muted">
              {t.used(p.used_count, p.usage_limit)}
              {p.valid_to ? ` · ${formatDate(p.valid_to)} gacha` : ""}
            </span>
            <span className={`text-xs font-semibold ${p.is_active ? "text-accent-text" : "text-muted"}`}>
              {p.is_active ? t.active : uz.admin.common.draft}
            </span>
            <ConfirmButton
              label={uz.admin.common.archive}
              confirm={uz.admin.common.archiveConfirm}
              action={archivePromo.bind(null, p.id)}
              className="btn-ghost text-sm text-danger"
            />
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{uz.admin.common.empty}</li> : null}
      </ul>
    </div>
  );
}
