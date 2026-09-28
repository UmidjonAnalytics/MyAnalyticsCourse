import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleX, Undo2 } from "lucide-react";
import { PendingRefresher } from "@/components/checkout/PendingRefresher";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.result.title };

// Where providers send the browser back, and the receipt page from the profile.
// The status shown comes from OUR database (set only by provider callbacks), never from the URL.
export default async function PaymentResult({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  await requireUser(`/tolov/natija/${orderId}`);
  const supabase = await createClient();
  // RLS: students only see their own orders.
  const { data: order } = await supabase
    .from("orders")
    .select("id, number, status, final_amount, provider, created_at, paid_at, product_type, courses(title, slug), bundles(title, slug)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();

  const title = order.courses?.title ?? order.bundles?.title ?? "";
  const productHref = order.courses ? `/kurs/${order.courses.slug}` : order.bundles ? `/toplam/${order.bundles.slug}` : "/";
  const retryHref = order.courses ? `/tolov/kurs/${order.courses.slug}` : order.bundles ? `/tolov/toplam/${order.bundles.slug}` : "/";
  const r = uz.result;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card p-6 sm:p-8">
        {order.status === "pending" ? (
          <PendingRefresher />
        ) : order.status === "paid" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-accent-text" aria-hidden="true" />
            <h1 className="mt-3 text-2xl font-bold">{r.paid}</h1>
            <p className="mt-2 text-muted">{r.paidText}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={order.courses ? `/dars/${order.courses.slug}` : "/mening-kurslarim"} className="btn-primary">
                {r.start}
              </Link>
              <Link href="/mening-kurslarim" className="btn-secondary">
                {r.myCourses}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {order.status === "refunded" ? (
              <Undo2 className="mx-auto size-12 text-muted" aria-hidden="true" />
            ) : (
              <CircleX className="mx-auto size-12 text-danger" aria-hidden="true" />
            )}
            <h1 className="mt-3 text-2xl font-bold">{order.status === "refunded" ? r.refunded : r.failed}</h1>
            <p className="mt-2 text-muted">{order.status === "refunded" ? r.refundedText : r.failedText}</p>
            {order.status === "cancelled" ? (
              <Link href={retryHref} className="btn-primary mt-6">
                {r.retry}
              </Link>
            ) : null}
          </div>
        )}

        <section className="mt-8 border-t border-border pt-5" aria-labelledby="receipt">
          <h2 id="receipt" className="font-bold">
            {r.receipt} · {r.order(order.number)}
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{uz.checkout.product}</dt>
              <dd className="text-right">
                <Link href={productHref} className="link">
                  {title}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{r.amount}</dt>
              <dd className="font-semibold">{formatSom(order.final_amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{r.method}</dt>
              <dd>{order.provider ? (uz.checkout.providers[order.provider] ?? order.provider) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{r.date}</dt>
              <dd>{formatDateTime(order.paid_at ?? order.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{r.status}</dt>
              <dd>{r.statuses[order.status]}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
