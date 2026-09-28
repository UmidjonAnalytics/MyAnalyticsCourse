import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PaymeCardForm } from "@/components/checkout/PaymeCardForm";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { paymeCardConfig, paymeCardFormEnabled } from "@/lib/payments/payme";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.card.title };

export default async function CardPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId) || !paymeCardFormEnabled()) notFound();
  await requireUser(`/tolov/karta/${orderId}`);
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, status, final_amount").eq("id", orderId).maybeSingle();
  if (!order) notFound();
  if (order.status !== "pending") redirect(`/tolov/natija/${orderId}`);
  const cfg = paymeCardConfig();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PaymeCardForm orderId={order.id} amount={order.final_amount} merchantId={cfg.merchantId} apiUrl={cfg.apiUrl} />
    </div>
  );
}
