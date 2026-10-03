/* eslint-disable @next/next/no-img-element -- entry screenshots come from Supabase Storage */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Database, Download, ExternalLink, Gift, LogIn, Medal, Trophy, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ChallengeEntryForm } from "@/components/course/ChallengeEntryForm";
import { Markdown } from "@/components/Markdown";
import { Notice } from "@/components/Notice";
import { getCurrentUser } from "@/lib/auth/session";
import { challengeStatus, daysLeft } from "@/lib/challenge";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;
const t = uz.challenge;
export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("challenges")
    .select("*, open_datasets(title, slug, file_path)")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await load(slug);
  return c ? { title: c.title, description: c.short_description } : {};
}

const medal = ["", "text-star", "text-muted", "text-[#b08d57]"];

export default async function ChallengePage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) notFound();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const status = challengeStatus(c);
  const [{ data: count }, { data: gallery }, { data: mine }] = await Promise.all([
    supabase.rpc("challenge_entry_count", { p_challenge_id: c.id }),
    supabase.rpc("challenge_gallery", { p_challenge_id: c.id }),
    user
      ? supabase.from("challenge_entries").select("link_url, summary, image_path, place").eq("challenge_id", c.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const imageUrl = (path: string) => supabase.storage.from("challenge-images").getPublicUrl(path).data.publicUrl;
  const dataset = c.open_datasets;
  const winners = (gallery ?? []).filter((g) => g.place);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link href="/challenge" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.back}
      </Link>

      <header className="mt-4">
        <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${status === "active" ? "text-accent-text" : "text-muted"}`}>
          <Trophy className="size-4" aria-hidden="true" />
          {status === "active" ? t.active : status === "upcoming" ? t.upcoming : t.past}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-lg text-muted">{c.short_description}</p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden="true" />
            {status === "upcoming" ? t.startsAt(formatDateTime(c.starts_at)) : status === "active" ? t.endsIn(formatDateTime(c.ends_at)) : t.ended(formatDateTime(c.ends_at))}
          </li>
          {status === "active" ? <li className="font-semibold text-accent-text">{t.daysLeft(daysLeft(c.ends_at))}</li> : null}
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            {t.entries(count ?? 0)}
          </li>
          {c.prize ? (
            <li className="inline-flex items-center gap-1.5 font-semibold text-text">
              <Gift className="size-4 text-accent-text" aria-hidden="true" />
              {t.prize}: {c.prize}
            </li>
          ) : null}
        </ul>
      </header>

      {winners.length > 0 ? (
        <section aria-labelledby="winners" className="mt-8 rounded-xl border border-accent bg-accent-soft p-5">
          <h2 id="winners" className="flex items-center gap-2 text-lg font-bold">
            <Medal className="size-5 text-accent-text" aria-hidden="true" />
            {t.winners}
          </h2>
          <ol className="mt-3 space-y-1">
            {winners.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <Medal className={`size-4 ${medal[w.place ?? 0]}`} aria-hidden="true" />
                <span className="font-semibold">{t.place(w.place!)}:</span>
                {w.username ? (
                  <Link href={`/u/${w.username}`} className="hover:underline">
                    {w.author}
                  </Link>
                ) : (
                  <span>{w.author}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {c.brief_md ? (
        <section aria-labelledby="task" className="card mt-8 border-l-4 border-l-accent p-5 sm:p-6">
          <h2 id="task" className="text-xl font-bold">
            {t.task}
          </h2>
          <Markdown className="mt-3">{c.brief_md}</Markdown>
        </section>
      ) : null}

      {dataset ? (
        <section aria-labelledby="data" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-5">
          <div>
            <h2 id="data" className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Database className="size-4" aria-hidden="true" />
              {t.dataset}
            </h2>
            <Link href={`/dataset/${dataset.slug}`} className="mt-1 block font-bold hover:underline">
              {dataset.title}
            </Link>
          </div>
          {dataset.file_path ? (
            user ? (
              <a href={`/api/open-data/${dataset.slug}/download`} className="btn-secondary">
                <Download className="size-4" aria-hidden="true" />
                {t.downloadData}
              </a>
            ) : (
              <Link href={`/dataset/${dataset.slug}`} className="btn-secondary">
                <Download className="size-4" aria-hidden="true" />
                {t.downloadData}
              </Link>
            )
          ) : null}
        </section>
      ) : null}

      {c.rules_md ? (
        <section aria-labelledby="rules" className="mt-8">
          <h2 id="rules" className="text-xl font-bold">
            {t.rules}
          </h2>
          <Markdown className="mt-3">{c.rules_md}</Markdown>
        </section>
      ) : null}

      <section aria-labelledby="submit" className="card mt-8 space-y-4 p-5 sm:p-6">
        <h2 id="submit" className="text-xl font-bold">
          {mine ? t.yourEntry : t.submitTitle}
        </h2>
        {status === "upcoming" ? (
          <Notice>{t.notStarted}</Notice>
        ) : status === "ended" ? (
          <Notice>{t.closed}</Notice>
        ) : !user ? (
          <Link href={`/kirish?sabab=kerak&next=${encodeURIComponent(`/challenge/${c.slug}`)}`} className="btn-primary">
            <LogIn className="size-4" aria-hidden="true" />
            {t.loginToJoin}
          </Link>
        ) : (
          <>
            <p className="text-sm text-muted">{t.submitLead}</p>
            <ChallengeEntryForm
              challengeId={c.id}
              slug={c.slug}
              userId={user.id}
              initial={mine ? { link_url: mine.link_url, summary: mine.summary, image_path: mine.image_path } : null}
            />
          </>
        )}
      </section>

      <section aria-labelledby="gallery" className="mt-10">
        <h2 id="gallery" className="text-xl font-bold">
          {t.gallery}
        </h2>
        {status !== "ended" ? (
          <p className="mt-2 text-muted">{t.galleryHidden}</p>
        ) : !gallery || gallery.length === 0 ? (
          <p className="mt-2 text-muted">{t.galleryEmpty}</p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2">
            {gallery.map((g) => (
              <li key={g.id} className={`card flex flex-col overflow-hidden ${g.place ? "border-accent" : ""}`}>
                {g.image_path ? <img src={imageUrl(g.image_path)} alt="" loading="lazy" className="aspect-video w-full bg-surface-muted object-cover" /> : null}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={g.author} size={32} />
                    {g.username ? (
                      <Link href={`/u/${g.username}`} className="font-semibold hover:underline">
                        {g.author}
                      </Link>
                    ) : (
                      <span className="font-semibold">{g.author}</span>
                    )}
                    {g.place ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">
                        <Medal className={`size-3.5 ${medal[g.place]}`} aria-hidden="true" />
                        {t.place(g.place)}
                      </span>
                    ) : null}
                  </div>
                  {g.summary ? <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap text-sm">{g.summary}</p> : <span className="flex-1" />}
                  <a href={g.link_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn-secondary mt-3 min-h-10 self-start text-sm">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    {t.viewWork}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
