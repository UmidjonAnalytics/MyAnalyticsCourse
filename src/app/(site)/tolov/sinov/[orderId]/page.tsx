import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { TestPayButtons } from "@/components/checkout/TestPayButtons";
import { Notice } from "@/components/Notice";
import { requireUser } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.testPay.title };

// Fake "provider page" for ENABLE_TEST_PAYMENTS=true. Turn it off before launch.
export default async function TestPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  await requireUser(`/tolov/sinov/${orderId}`);
  if (!serverEnv().ENABLE_TEST_PAYMENTS) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Notice>{uz.testPay.disabled}</Notice>
      </div>
    );
  }
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, number, final_amount, status").eq("id", orderId).maybeSingle();
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card space-y-5 border-2 border-dashed border-border-strong p-6 sm:p-8">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
          <FlaskConical className="size-4" aria-hidden="true" />
          {uz.testPay.title}
        </p>
        <h1 className="font-display text-3xl font-bold">{formatSom(order.final_amount)}</h1>
        <p className="text-sm text-muted">
          {uz.result.order(order.number)} · {uz.testPay.text}
        </p>
        {order.status === "pending" ? <TestPayButtons orderId={order.id} /> : <Notice>{uz.result.statuses[order.status]}</Notice>}
      </div>
    </div>
  );
}
