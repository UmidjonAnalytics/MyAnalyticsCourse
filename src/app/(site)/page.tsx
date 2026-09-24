import Link from "next/link";
import { BookOpen, Layers } from "lucide-react";
import { Notice } from "@/components/Notice";
import { isSupabaseConfigured } from "@/lib/env";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Phase 1: simple landing page that also proves the database connection works.
// Phase 2 replaces the list with the full catalog.
async function loadCatalog() {
  const supabase = await createClient();
  const [courses, bundles] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug, short_description, price, lessons(count)")
      .order("position"),
    supabase
      .from("bundles")
      .select("id, title, slug, short_description, price, bundle_courses(count)")
      .order("position"),
  ]);
  if (courses.error || bundles.error) return { error: true as const };
  return { error: false as const, courses: courses.data, bundles: bundles.data };
}

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const catalog = configured ? await loadCatalog() : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{uz.home.title}</h1>
        <p className="mt-4 text-lg text-muted">{uz.home.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/kirish" className="btn-primary">
            {uz.home.ctaStart}
          </Link>
          <a href="#kurslar" className="btn-secondary">
            {uz.home.ctaCourses}
          </a>
        </div>
      </section>

      <section id="kurslar" className="mt-16 scroll-mt-8" aria-labelledby="courses-title">
        <h2 id="courses-title" className="text-2xl font-bold">
          {uz.home.coursesTitle}
        </h2>
        <div className="mt-6">
          {!configured ? (
            <Notice>{uz.home.notConfigured}</Notice>
          ) : catalog?.error ? (
            <Notice tone="error">{uz.home.loadError}</Notice>
          ) : catalog && catalog.courses.length === 0 ? (
            <p className="text-muted">{uz.home.empty}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog?.courses.map((c) => (
                <li key={c.id} className="card flex flex-col p-5">
                  <h3 className="text-lg font-bold">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{c.short_description}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <BookOpen className="size-4" aria-hidden="true" />
                      {uz.home.lessons(c.lessons[0]?.count ?? 0)}
                    </span>
                    <span className="font-bold">{formatSom(c.price)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {catalog && !catalog.error && catalog.bundles.length > 0 ? (
        <section className="mt-12" aria-labelledby="bundles-title">
          <h2 id="bundles-title" className="text-2xl font-bold">
            {uz.home.bundlesTitle}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {catalog.bundles.map((b) => (
              <li key={b.id} className="card flex flex-col p-5">
                <h3 className="text-lg font-bold">{b.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{b.short_description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Layers className="size-4" aria-hidden="true" />
                    {uz.home.courses(b.bundle_courses[0]?.count ?? 0)}
                  </span>
                  <span className="font-bold">{formatSom(b.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
