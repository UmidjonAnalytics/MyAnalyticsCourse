import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Gift, Trophy } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { challengeStatus, daysLeft } from "@/lib/challenge";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.challenge.title, description: uz.challenge.lead };
export const dynamic = "force-dynamic";
const t = uz.challenge;

type Row = { id: string; title: string; slug: string; short_description: string; prize: string; cover_url: string | null; starts_at: string; ends_at: string };

function Card({ c }: { c: Row }) {
  const status = challengeStatus(c);
  return (
    <li className="card group relative flex flex-col overflow-hidden">
      <CourseCover url={c.cover_url} label={c.title} />
      <div className="flex flex-1 flex-col p-5">
        <p className={`text-xs font-semibold uppercase tracking-wide ${status === "active" ? "text-accent-text" : "text-muted"}`}>
          {status === "active" ? t.daysLeft(daysLeft(c.ends_at)) : status === "upcoming" ? t.startsAt(formatDate(c.starts_at)) : t.ended(formatDate(c.ends_at))}
        </p>
        <h3 className="mt-2 text-lg font-bold">
          <Link href={`/challenge/${c.slug}`} className="after:absolute after:inset-0 group-hover:underline">
            {c.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{c.short_description}</p>
        {c.prize ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
            <Gift className="size-4 text-accent-text" aria-hidden="true" />
            {c.prize}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export default async function ChallengesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select("id, title, slug, short_description, prize, cover_url, starts_at, ends_at")
    .eq("is_published", true)
    .is("archived_at", null)
    .order("starts_at", { ascending: false });
  const all = data ?? [];
  const groups = (["active", "upcoming", "ended"] as const).map((s) => ({ s, items: all.filter((c) => challengeStatus(c) === s) }));
  const label = { active: t.active, upcoming: t.upcoming, ended: t.past };
  const Icon = { active: Trophy, upcoming: CalendarClock, ended: Trophy };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.lead}</p>
      {all.length === 0 ? <p className="mt-8 text-muted">{t.empty}</p> : null}
      {groups
        .filter((g) => g.items.length > 0)
        .map(({ s, items }) => {
          const I = Icon[s];
          return (
            <section key={s} aria-labelledby={`ch-${s}`} className="mt-10">
              <h2 id={`ch-${s}`} className="flex items-center gap-2 text-xl font-bold">
                <I className="size-5 text-accent-text" aria-hidden="true" />
                {label[s]}
              </h2>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <Card key={c.id} c={c} />
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}
