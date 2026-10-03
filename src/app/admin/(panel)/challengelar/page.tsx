import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { challengeStatus } from "@/lib/challenge";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.challenges.title };
export const dynamic = "force-dynamic";

export default async function AdminChallenges() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select("id, title, is_published, starts_at, ends_at, challenge_entries(count)")
    .is("archived_at", null)
    .order("starts_at", { ascending: false });
  const t = uz.admin.challenges;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-muted">{t.lead}</p>
        </div>
        <Link href="/challengelar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.add}
        </Link>
      </div>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/challengelar/${c.id}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-muted">
              <Trophy className="size-5 text-accent-text" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.title}</span>
                <span className="text-xs text-muted">
                  {formatDate(c.starts_at)} – {formatDate(c.ends_at)} · {t.status[challengeStatus(c)]}
                </span>
              </span>
              <span className="text-xs text-muted">{uz.challenge.entries(c.challenge_entries[0]?.count ?? 0)}</span>
              <span className={`text-xs font-semibold ${c.is_published ? "text-accent-text" : "text-muted"}`}>
                {c.is_published ? uz.admin.common.published : uz.admin.common.draft}
              </span>
            </Link>
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
