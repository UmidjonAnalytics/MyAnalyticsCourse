import Link from "next/link";
import { BookOpen, CheckCircle2, Layers, Trophy } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Notice } from "@/components/Notice";
import { getCurrentUser } from "@/lib/auth/session";
import { PathCardView, ProjectCardView } from "@/components/catalog/Cards";
import { listCatalog } from "@/lib/data/catalog";
import { listPaths, listProjects } from "@/lib/data/paths";
import { daysLeft } from "@/lib/challenge";
import { isSupabaseConfigured } from "@/lib/env";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ yonalish?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { yonalish } = await searchParams;
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;
  const supabase = configured ? await createClient() : null;
  const [catalog, paths, projects, activeChallenge] = supabase
    ? await Promise.all([
        listCatalog(supabase, user?.id ?? null),
        listPaths(supabase),
        listProjects(supabase),
        supabase
          .from("challenges")
          .select("title, slug, short_description, prize, ends_at")
          .eq("is_published", true)
          .is("archived_at", null)
          .lte("starts_at", new Date().toISOString())
          .gte("ends_at", new Date().toISOString())
          .order("ends_at")
          .limit(1)
          .maybeSingle()
          .then((r) => r.data),
      ])
    : [null, [], [], null];

  const activeCat = catalog?.categories.find((c) => c.slug === yonalish) ?? null;
  const courses = catalog ? catalog.courses.filter((c) => !activeCat || c.category_id === activeCat.id) : [];
  const courseTitle = new Map((catalog?.courses ?? []).map((c) => [c.id, c.title]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{uz.home.title}</h1>
        <p className="mt-4 text-lg text-muted">{uz.home.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <Link href="/mening-kurslarim" className="btn-primary">
              {uz.nav.myCourses}
            </Link>
          ) : (
            <Link href="/kirish" className="btn-primary">
              {uz.home.ctaStart}
            </Link>
          )}
          <a href="#kurslar" className="btn-secondary">
            {uz.home.ctaCourses}
          </a>
        </div>
      </section>

      {activeChallenge ? (
        <section aria-labelledby="challenge-title" className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent bg-accent-soft p-5 sm:p-6">
          <div className="min-w-0 max-w-2xl">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-text">
              <Trophy className="size-4" aria-hidden="true" />
              {uz.challenge.homeTitle} · {uz.challenge.daysLeft(daysLeft(activeChallenge.ends_at))}
            </p>
            <h2 id="challenge-title" className="mt-1 text-xl font-bold">
              {activeChallenge.title}
            </h2>
            <p className="mt-1 text-muted">{activeChallenge.short_description}</p>
            {activeChallenge.prize ? <p className="mt-1 text-sm font-semibold">{uz.challenge.prize}: {activeChallenge.prize}</p> : null}
          </div>
          <Link href={`/challenge/${activeChallenge.slug}`} className="btn-primary">
            {uz.challenge.submitTitle}
          </Link>
        </section>
      ) : null}

      {paths.length > 0 ? (
        <section className="mt-16" aria-labelledby="paths-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="paths-title" className="text-2xl font-bold">
                {uz.home.pathsTitle}
              </h2>
              <p className="mt-1 text-muted">{uz.home.pathsLead}</p>
            </div>
            <Link href="/yollar" className="text-sm font-semibold text-accent-text hover:underline">
              {uz.home.seeAll}
            </Link>
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paths.slice(0, 3).map((p) => (
              <PathCardView key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ) : null}

      <section id="kurslar" className="mt-16 scroll-mt-8" aria-labelledby="courses-title">
        <h2 id="courses-title" className="text-2xl font-bold">
          {uz.home.coursesTitle}
        </h2>

        {catalog && catalog.categories.length > 1 ? (
          <nav aria-label={uz.catalog.filterLabel} className="mt-4 flex flex-wrap gap-2">
            {[{ slug: null, name: uz.catalog.all }, ...catalog.categories].map((c) => {
              const active = (c.slug ?? null) === (activeCat?.slug ?? null);
              return (
                <Link
                  key={c.slug ?? "all"}
                  href={c.slug ? `/?yonalish=${c.slug}#kurslar` : "/#kurslar"}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                    active ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:bg-surface-muted"
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="mt-6">
          {!configured ? (
            <Notice>{uz.home.notConfigured}</Notice>
          ) : !catalog ? (
            <Notice tone="error">{uz.home.loadError}</Notice>
          ) : courses.length === 0 ? (
            <p className="text-muted">{activeCat ? uz.catalog.emptyCategory : uz.home.empty}</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <li key={c.id} className="card group relative flex flex-col overflow-hidden">
                  <CourseCover url={c.cover_url} label={c.categoryName ?? c.title} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      {c.categoryName ? <span className="text-xs font-semibold uppercase tracking-wide text-muted">{c.categoryName}</span> : <span />}
                      {c.owned ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          {uz.catalog.owned}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-lg font-bold">
                      <Link href={`/kurs/${c.slug}`} className="after:absolute after:inset-0 group-hover:underline">
                        {c.title}
                      </Link>
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-muted">{c.short_description}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <BookOpen className="size-4" aria-hidden="true" />
                        {uz.home.lessons(c.lessonCount)}
                      </span>
                      <span className="font-bold">{c.owned ? uz.catalog.continue : formatSom(c.price)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {catalog && catalog.bundles.length > 0 ? (
        <section className="mt-14" aria-labelledby="bundles-title">
          <h2 id="bundles-title" className="text-2xl font-bold">
            {uz.home.bundlesTitle}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {catalog.bundles.map((b) => (
              <li key={b.id} className="card group relative flex flex-col p-5">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Layers className="size-4" aria-hidden="true" />
                  {uz.home.courses(b.courseIds.length)}
                </span>
                <h3 className="mt-2 text-lg font-bold">
                  <Link href={`/toplam/${b.slug}`} className="after:absolute after:inset-0 group-hover:underline">
                    {b.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{b.short_description}</p>
                <p className="mt-3 flex-1 text-sm">{b.courseIds.map((id) => courseTitle.get(id)).filter(Boolean).join(" · ")}</p>
                <p className="mt-4 text-right font-bold">{formatSom(b.price)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section className="mt-14" aria-labelledby="projects-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="projects-title" className="text-2xl font-bold">
                {uz.home.projectsTitle}
              </h2>
              <p className="mt-1 text-muted">{uz.home.projectsLead}</p>
            </div>
            <Link href="/loyihalar" className="text-sm font-semibold text-accent-text hover:underline">
              {uz.home.seeAll}
            </Link>
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 3).map((p) => (
              <ProjectCardView key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
