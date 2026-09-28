import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import { Markdown } from "@/components/Markdown";
import { Notice } from "@/components/Notice";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedCourseIds } from "@/lib/data/catalog";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { bundlePrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

async function loadBundle(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bundles")
    .select("*, bundle_courses(position, courses(id, title, slug, short_description, cover_url, price, is_published, archived_at))")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const bundle = await loadBundle((await params).slug);
  return bundle ? { title: bundle.title, description: bundle.short_description } : {};
}

export default async function BundlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const bundle = await loadBundle(slug);
  if (!bundle) notFound();

  const user = await getCurrentUser();
  const owned = await getOwnedCourseIds(await createClient(), user?.id ?? null);
  const courses = bundle.bundle_courses
    .filter((bc) => bc.courses && bc.courses.is_published && !bc.courses.archived_at)
    .sort((a, b) => a.position - b.position)
    .map((bc) => ({ ...bc.courses, owned: owned.has(bc.courses.id) }));

  const price = bundlePrice({
    bundlePrice: bundle.price,
    allowUpgradePricing: bundle.allow_upgrade_pricing,
    courses: courses.map((c) => ({ price: c.price, owned: c.owned })),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link href="/#kurslar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.bundle.back}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold sm:text-4xl">{bundle.title}</h1>
          <p className="mt-3 text-lg text-muted">{bundle.short_description}</p>
          {bundle.description ? <Markdown className="mt-6">{bundle.description}</Markdown> : null}

          <section className="mt-8" aria-labelledby="includes">
            <h2 id="includes" className="text-xl font-bold">
              {uz.bundle.includes}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {courses.map((c) => (
                <li key={c.id} className="card group relative overflow-hidden">
                  <CourseCover url={c.cover_url} label={c.title} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold">
                        <Link href={`/kurs/${c.slug}`} className="after:absolute after:inset-0 group-hover:underline">
                          {c.title}
                        </Link>
                      </h3>
                      {c.owned ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          {uz.bundle.ownedCourse}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted">{c.short_description}</p>
                    <p className="mt-2 text-sm font-semibold">{formatSom(c.price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card space-y-4 p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{uz.bundle.fullPrice}</dt>
                <dd className="text-muted line-through">{formatSom(price.fullPrice)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold">{uz.bundle.bundlePrice}</dt>
                <dd className={price.isUpgrade ? "line-through" : "font-display text-2xl font-bold"}>{formatSom(bundle.price)}</dd>
              </div>
              {price.isUpgrade ? (
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold">{uz.bundle.upgradePrice}</dt>
                  <dd className="font-display text-2xl font-bold">{formatSom(price.payPrice)}</dd>
                </div>
              ) : null}
            </dl>
            {price.savings > 0 && !price.isUpgrade ? (
              <p className="rounded-md bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-text">
                {uz.bundle.savings(formatSom(price.savings))}
              </p>
            ) : null}
            {price.isUpgrade ? <Notice>{uz.bundle.upgradeNote(price.ownedCount)}</Notice> : null}
            {price.allOwned ? (
              <Notice tone="success">{uz.bundle.allOwned}</Notice>
            ) : (
              <Link href={`/tolov/toplam/${bundle.slug}`} className="btn-primary w-full">
                {uz.bundle.buy}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
