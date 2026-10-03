/* eslint-disable @next/next/no-img-element -- entry screenshots from Supabase Storage */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { deleteChallenge } from "@/app/admin/(panel)/actions/content";
import { ChallengeForm, EntryControls } from "@/components/admin/ChallengeForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { publicSiteUrl } from "@/lib/admin/links";
import { challengeStatus } from "@/lib/challenge";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.challenges.edit };
export const dynamic = "force-dynamic";

export default async function EditChallenge({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: challenge }, { data: datasets }, { data: entries }] = await Promise.all([
    supabase.from("challenges").select("*").eq("id", id).maybeSingle(),
    supabase.from("open_datasets").select("id, title").is("archived_at", null).order("position"),
    supabase
      .from("challenge_entries")
      .select("id, link_url, image_path, summary, place, hidden_at, created_at, profiles(full_name, phone)")
      .eq("challenge_id", id)
      .order("place", { ascending: true, nullsFirst: false })
      .order("created_at"),
  ]);
  if (!challenge) notFound();
  const site = await publicSiteUrl();
  const t = uz.admin.challenges;
  const imageUrl = (path: string) => supabase.storage.from("challenge-images").getPublicUrl(path).data.publicUrl;

  return (
    <div className="max-w-5xl">
      <Link href="/challengelar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          <p className="text-sm text-muted">{t.status[challengeStatus(challenge)]}</p>
          {site && challenge.is_published ? (
            <a href={`${site}/challenge/${challenge.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-text hover:underline">
              {site.replace(/^https?:\/\//, "")}/challenge/{challenge.slug}
            </a>
          ) : null}
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteChallenge.bind(null, challenge.id)} className="btn-danger" danger />
      </div>

      <section className="card mb-6 p-5 sm:p-6" aria-labelledby="entries">
        <h2 id="entries" className="text-lg font-bold">
          {t.entries} <span className="text-sm font-normal text-muted">({entries?.length ?? 0})</span>
        </h2>
        {!entries?.length ? (
          <p className="mt-2 text-sm text-muted">{t.noEntries}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {entries.map((e) => (
              <li key={e.id} className={`flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row ${e.hidden_at ? "opacity-60" : ""}`}>
                {e.image_path ? <img src={imageUrl(e.image_path)} alt="" className="h-28 w-44 shrink-0 rounded-md border border-border object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold">{e.profiles?.full_name || (e.profiles?.phone ? `+${e.profiles.phone}` : "—")}</span>
                    <time dateTime={e.created_at} className="text-muted">
                      {formatDateTime(e.created_at)}
                    </time>
                    {e.hidden_at ? <span className="text-xs font-semibold">{t.hidden}</span> : null}
                  </div>
                  <a href={e.link_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-accent-text hover:underline">
                    <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                    {e.link_url}
                  </a>
                  {e.summary ? <p className="mt-2 whitespace-pre-wrap text-sm">{e.summary}</p> : null}
                  <div className="mt-3">
                    <EntryControls id={e.id} place={e.place} hidden={Boolean(e.hidden_at)} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChallengeForm challenge={challenge} datasets={datasets ?? []} />
    </div>
  );
}
