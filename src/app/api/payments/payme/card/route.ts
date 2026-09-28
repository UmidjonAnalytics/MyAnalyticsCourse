import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { logPaymentEvent } from "@/lib/payments/events";
import { paymeCardFormEnabled, paymeReceiptDetail, paymeSubscribe } from "@/lib/payments/payme";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// On-site card payment (Payme Subscribe API). The browser already did cards.create /
// cards.get_verify_code / cards.verify directly with Payme and sends us only the card TOKEN
// (never the card number). Here: receipts.create + receipts.pay. Access is still granted only
// by Payme's Merchant API callback (PerformTransaction), like every other payment.
const body = z.object({ orderId: z.uuid(), token: z.string().min(10).max(2000) });

export async function POST(request: NextRequest) {
  if (!paymeCardFormEnabled()) return apiError(404, "generic");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "validation_failed");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return apiError(401, "not_logged_in");
  if (!(await rateLimit(`card-pay:${userId}`, 10, 600))) return apiError(429, "rate_limited");

  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, user_id, status, final_amount, courses(title), bundles(title)")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.user_id !== userId) return apiError(404, "generic");
  if (order.status !== "pending") return apiError(409, "generic");

  const amount = order.final_amount * 100;
  const detail = paymeReceiptDetail(order.courses?.title ?? order.bundles?.title ?? "Kurs", amount);
  const created = await paymeSubscribe<{ receipt: { _id: string } }>("receipts.create", {
    amount,
    account: { order_id: order.id },
    ...(detail ? { detail } : {}),
  });
  if (!created.ok) {
    await logPaymentEvent({ provider: "payme", method: "receipts.create", payload: { order: order.id }, response: created, orderId: order.id, error: String(created.code) });
    return apiError(502, "generic");
  }
  const paid = await paymeSubscribe<{ receipt: { _id: string; state: number } }>("receipts.pay", {
    id: created.result.receipt._id,
    token: parsed.data.token,
  });
  await logPaymentEvent({
    provider: "payme",
    method: "receipts.pay",
    payload: { order: order.id, receipt: created.result.receipt._id },
    response: paid.ok ? { state: paid.result.receipt.state } : paid,
    orderId: order.id,
    error: paid.ok ? null : String(paid.code),
  });
  if (!paid.ok) return apiError(402, "generic");
  return apiOk({ state: paid.result.receipt.state });
}
