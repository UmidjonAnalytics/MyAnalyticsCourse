import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Notice } from "@/components/Notice";
import { requireUser } from "@/lib/auth/session";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.checkout.title };

// Phase 2 placeholder. Phase 3 turns this into the real checkout (promo code, Payme/Click/Paynet).
export default async function CheckoutPage({ params }: { params: Promise<{ type: string; slug: string }> }) {
  const { type, slug } = await params;
  if (type !== "kurs" && type !== "toplam") notFound();
  await requireUser(`/tolov/${type}/${slug}`);

  const supabase = await createClient();
  const { data: product } = await supabase
    .from(type === "kurs" ? "courses" : "bundles")
    .select("title, price")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  if (!product) notFound();

  const backHref = type === "kurs" ? `/kurs/${slug}` : `/toplam/${slug}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.checkout.back}
      </Link>
      <div className="card mt-4 space-y-5 p-6">
        <h1 className="text-2xl font-bold">{uz.checkout.title}</h1>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{uz.checkout.product}</dt>
            <dd className="text-right font-semibold">{product.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{uz.checkout.price}</dt>
            <dd className="font-display text-xl font-bold">{formatSom(product.price)}</dd>
          </div>
        </dl>
        <Notice>{uz.checkout.soon}</Notice>
      </div>
    </div>
  );
}
