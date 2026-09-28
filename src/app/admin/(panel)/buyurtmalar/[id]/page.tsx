import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RefundButton } from "@/components/admin/RefundButton";
import { formatDateTime, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.orders.title };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("*, profiles(id, full_name, phone), courses(title), bundles(title), promo_codes(code)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const [{ data: payments }, { data: events }, { data: enrollments }] = await Promise.all([
    supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
    supabase.from("payment_events").select("*").eq("order_id", id).order("received_at", { ascending: false }).limit(100),
    supabase.from("enrollments").select("id, revoked_at, courses(title)").eq("order_id", id),
  ]);
  const t = uz.admin.orders;
  const card = "card p-5 sm:p-6";
  const row = "flex justify-between gap-4 py-1";

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/buyurtmalar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>
      <section className={card}>
        <h1 className="text-2xl font-bold">{t.detail(o.number)}</h1>
        <dl className="mt-4 grid gap-x-8 text-sm sm:grid-cols-2">
          <div className={row}>
            <dt className="text-muted">{t.student}</dt>
            <dd>
              <Link href={`/talabalar/${o.profiles?.id}`} className="link">
                {o.profiles?.full_name || (o.profiles?.phone ? formatUzPhone(o.profiles.phone) : "—")}
              </Link>
            </dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t.product}</dt>
            <dd>{o.courses?.title ?? o.bundles?.title}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{uz.checkout.listPrice}</dt>
            <dd>{formatSom(o.amount)}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t.discount}</dt>
            <dd>
              {formatSom(o.discount)}
              {o.promo_codes?.code ? ` (${o.promo_codes.code})` : ""}
            </dd>
          </div>
          <div className={row}>
            <dt className="font-semibold">{t.amount}</dt>
            <dd className="font-semibold">{formatSom(o.final_amount)}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t.provider}</dt>
            <dd>{o.provider ? (uz.checkout.providers[o.provider] ?? o.provider) : "—"}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t.status}</dt>
            <dd className="font-semibold">{uz.result.statuses[o.status]}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t.created}</dt>
            <dd>{formatDateTime(o.created_at)}</dd>
          </div>
          {o.paid_at ? (
            <div className={row}>
              <dt className="text-muted">{t.paid}</dt>
              <dd>{formatDateTime(o.paid_at)}</dd>
            </div>
          ) : null}
        </dl>
        {o.status === "paid" || o.status === "pending" ? (
          <div className="mt-5 border-t border-border pt-5">
            <RefundButton orderId={o.id} pending={o.status === "pending"} />
          </div>
        ) : null}
      </section>

      <section className={card}>
        <h2 className="font-bold">{t.enrollments}</h2>
        <ul className="mt-2 text-sm">
          {(enrollments ?? []).map((e) => (
            <li key={e.id} className={e.revoked_at ? "text-muted line-through" : ""}>
              {e.courses?.title}
            </li>
          ))}
          {!enrollments?.length ? <li className="text-muted">—</li> : null}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-bold">{t.payments}</h2>
        {payments?.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 pr-4 font-semibold">{t.provider}</th>
                  <th className="py-1 pr-4 font-semibold">ID</th>
                  <th className="py-1 pr-4 font-semibold">{t.amount}</th>
                  <th className="py-1 pr-4 font-semibold">{t.status}</th>
                  <th className="py-1 font-semibold">{t.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4">{p.provider}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{p.provider_transaction_id}</td>
                    <td className="py-2 pr-4">{formatSom(p.amount)}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {p.state}
                      {p.provider_state !== null ? ` (${p.provider_state})` : ""}
                    </td>
                    <td className="py-2 text-xs text-muted">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.paymentsEmpty}</p>
        )}
      </section>

      <section className={card}>
        <h2 className="font-bold">{t.events}</h2>
        {events?.length ? (
          <ul className="mt-3 space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <details className="rounded-lg border border-border">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 px-3 text-sm">
                    <span className="font-mono text-xs text-muted">{formatDateTime(e.received_at)}</span>
                    <span className="font-semibold">{e.provider}</span>
                    <span className="font-mono text-xs">{e.method}</span>
                    {e.error ? <span className="text-xs font-semibold text-danger">error {e.error}</span> : null}
                  </summary>
                  <pre className="overflow-x-auto border-t border-border bg-surface-muted p-3 font-mono text-xs">
                    {JSON.stringify({ payload: e.payload, response: e.response }, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t.eventsEmpty}</p>
        )}
      </section>
    </div>
  );
}
