import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Award, Briefcase, ExternalLink, Globe, MapPin } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { GitHubIcon, LinkedInIcon } from "@/components/BrandIcons";
import type { PublicProfile } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Public, opt-in portfolio page. public_profile() returns nothing unless the student made it public.

type Params = Promise<{ username: string }>;
const t = uz.publicProfile;

const load = cache(async (username: string): Promise<PublicProfile | null> => {
  if (!/^[a-z0-9_]{3,30}$/i.test(username)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_profile", { p_username: username });
  return (data as PublicProfile | null) ?? null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const p = await load(username);
  if (!p) return { title: t.notFoundTitle, robots: { index: false } };
  const description = p.headline || t.stats(p.certificates.length, p.projects.length);
  return { title: p.full_name, description, openGraph: { title: p.full_name, description, type: "profile" } };
}

export default async function PublicProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const p = await load(username);
  if (!p) notFound();

  const skills = [...new Set(p.projects.flatMap((x) => x.skills))].slice(0, 20);
  const links = [
    p.linkedin_url ? { href: p.linkedin_url, label: "LinkedIn", icon: <LinkedInIcon /> } : null,
    p.github_url ? { href: p.github_url, label: "GitHub", icon: <GitHubIcon /> } : null,
    p.website_url ? { href: p.website_url, label: p.website_url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, ""), icon: <Globe className="size-4" aria-hidden="true" /> } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-8">
        <div className="shrink-0">
          <Avatar name={p.full_name} url={p.avatar_url} size={96} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{p.full_name}</h1>
          {p.headline ? <p className="mt-1 text-lg text-muted">{p.headline}</p> : null}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {p.location ? (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {p.location}
              </li>
            ) : null}
            <li>{t.memberSince(formatDate(p.member_since))}</li>
            <li className="font-semibold text-text">{t.stats(p.certificates.length, p.projects.length)}</li>
          </ul>
          {links.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer me" className="btn-secondary min-h-10 text-sm">
                    {l.icon}
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {p.bio ? <p className="mt-4 whitespace-pre-wrap">{p.bio}</p> : null}
        </div>
      </header>

      {skills.length > 0 ? (
        <section aria-labelledby="skills" className="mt-8">
          <h2 id="skills" className="text-lg font-bold">
            {t.skills}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <li key={s} className="rounded-md bg-surface-muted px-2.5 py-1 text-sm font-semibold">
                {s}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="certs" className="mt-8">
        <h2 id="certs" className="flex items-center gap-2 text-lg font-bold">
          <Award className="size-5 text-accent-text" aria-hidden="true" />
          {t.certificates}
        </h2>
        {p.certificates.length === 0 ? (
          <p className="mt-3 text-muted">{t.noCertificates}</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {p.certificates.map((c) => (
              <li key={c.code} className="card flex flex-col p-4">
                <p className="font-bold">{c.course_title}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(c.issued_at)}
                  {Number(c.hours) >= 1 ? ` · ${t.hours(Number(c.hours))}` : ""}
                </p>
                <Link href={`/sertifikat/${c.code}`} className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent-text hover:underline">
                  <Award className="size-4" aria-hidden="true" />
                  {t.viewCertificate}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="projects" className="mt-8">
        <h2 id="projects" className="flex items-center gap-2 text-lg font-bold">
          <Briefcase className="size-5 text-accent-text" aria-hidden="true" />
          {t.projects}
        </h2>
        {p.projects.length === 0 ? (
          <p className="mt-3 text-muted">{t.noProjects}</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {p.projects.map((pr) => (
              <li key={pr.slug} className="card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{pr.course_title}</p>
                <h3 className="mt-1 text-lg font-bold">{pr.title}</h3>
                {pr.summary ? <p className="mt-2 whitespace-pre-wrap">{pr.summary}</p> : null}
                {pr.skills.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.skills}>
                    {pr.skills.map((s) => (
                      <li key={s} className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={pr.link_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn-primary min-h-10 text-sm">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    {t.viewWork}
                  </a>
                  <Link href={`/loyiha/${pr.slug}`} className="btn-ghost min-h-10 text-sm">
                    {t.aboutProject}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="mt-12 rounded-xl border border-border bg-accent-soft p-6 text-center">
        <p className="text-lg font-bold">{t.ctaTitle}</p>
        <p className="mt-1 text-muted">{t.ctaText}</p>
        <Link href="/#kurslar" className="btn-primary mt-4">
          {t.ctaButton}
        </Link>
      </aside>
    </div>
  );
}
