import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { fillPlaceholders, getSiteSettings, siteOrigin } from "@/lib/data/site";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Oferta / privacy / refunds: text edited in admin → "Sayt sozlamalari".

async function loadPage(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("site_pages").select("title, body_md, updated_at").eq("slug", slug).maybeSingle();
  return data;
}

export async function legalMetadata(slug: string): Promise<Metadata> {
  const page = await loadPage(slug);
  return page ? { title: page.title } : {};
}

export async function LegalPage({ slug }: { slug: string }) {
  const [page, settings, origin] = await Promise.all([loadPage(slug), getSiteSettings(), siteOrigin()]);
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold">{page.title}</h1>
      <p className="mt-2 text-sm text-muted">{uz.legal.updated(formatDate(page.updated_at))}</p>
      <Markdown className="mt-8">{fillPlaceholders(page.body_md, settings, origin)}</Markdown>
    </article>
  );
}
