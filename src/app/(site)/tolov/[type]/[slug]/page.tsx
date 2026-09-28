import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Notice } from "@/components/Notice";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { checkoutProviders } from "@/lib/payments";
import { quote } from "@/lib/payments/orders";
import { paymeCardFormEnabled } from "@/lib/payments/payme";

export const metadata: Metadata = { title: uz.checkout.title };

export default async function CheckoutPage({ params }: { params: Promise<{ type: string; slug: string }> }) {
  const { type, slug } = await params;
  if ((type !== "kurs" && type !== "toplam") || !/^[a-z0-9-]{1,100}$/.test(slug)) notFound();
  const user = await requireUser(`/tolov/${type}/${slug}`);
  const ref = { type, slug } as const;
  const backHref = type === "kurs" ? `/kurs/${slug}` : `/toplam/${slug}`;
  const q = await quote(user.id, ref, null);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-10">
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.checkout.back}
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold">{uz.checkout.title}</h1>
      {q.ok ? (
        <CheckoutForm
          productRef={ref}
          initialQuote={q.quote}
          providers={checkoutProviders()}
          phoneVerified={Boolean(user.profile?.phone_verified)}
          cardForm={paymeCardFormEnabled()}
        />
      ) : (
        <div className="space-y-4">
          <Notice>{q.error}</Notice>
          <Link href="/mening-kurslarim" className="btn-primary">
            {uz.nav.myCourses}
          </Link>
        </div>
      )}
    </div>
  );
}
