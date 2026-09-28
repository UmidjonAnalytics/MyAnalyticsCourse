import "server-only";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

// Every provider callback is stored as-is in payment_events (never deleted), with our answer.
export async function logPaymentEvent(e: {
  provider: string;
  method: string | null;
  payload: unknown;
  response: unknown;
  orderId: string | null;
  error?: string | null;
}) {
  const uuid = /^[0-9a-f-]{36}$/;
  const { error } = await createAdminClient()
    .from("payment_events")
    .insert({
      provider: e.provider,
      method: e.method,
      payload: e.payload as Json,
      response: e.response as Json,
      order_id: e.orderId && uuid.test(e.orderId) ? e.orderId : null,
      processed: !e.error,
      error: e.error ?? null,
    });
  if (error) console.error("payment event log failed", error.message);
}
