import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PromoForm } from "@/components/admin/PromoForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.promo.edit };

// /promo/yangi = new code, /promo/<id> = edit.
export default async function PromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "yangi";
  const supabase = await createClient();
  const [{ data: courses }, { data: bundles }, promoRes] = await Promise.all([
    supabase.from("courses").select("id, title").is("archived_at", null).order("position"),
    supabase.from("bundles").select("id, title").is("archived_at", null).order("position"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("promo_codes").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!isNew && !promoRes.data) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/promo" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.promo.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{promoRes.data?.code ?? uz.admin.promo.new}</h1>
      <PromoForm promo={promoRes.data ?? undefined} courses={courses ?? []} bundles={bundles ?? []} />
    </div>
  );
}
