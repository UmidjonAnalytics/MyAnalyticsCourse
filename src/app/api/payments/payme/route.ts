import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { logPaymentEvent } from "@/lib/payments/events";
import { PAYME_MESSAGES, paymeAuthorized, paymeReceiptDetail } from "@/lib/payments/payme";
import { createAdminClient } from "@/lib/supabase/admin";

// Payme Merchant API (JSON-RPC 2.0). Payme calls this URL; set it in the Payme merchant cabinet:
//   https://<domain>/api/payments/payme
// Methods: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction,
// CheckTransaction, GetStatement. All state changes run inside database functions (0006).
// Payme always expects HTTP 200 with {result} or {error}.

type RpcId = string | number | null;

function rpcError(id: RpcId, code: number, data?: string) {
  return { id, error: { code, message: PAYME_MESSAGES[code] ?? PAYME_MESSAGES[-32600]!, ...(data ? { data } : {}) } };
}

const account = z.object({ order_id: z.string().max(64) }).loose();
const schemas = {
  CheckPerformTransaction: z.object({ amount: z.number().int().positive(), account }),
  CreateTransaction: z.object({ id: z.string().min(1).max(64), time: z.number().int(), amount: z.number().int().positive(), account }),
  PerformTransaction: z.object({ id: z.string().min(1).max(64) }),
  CancelTransaction: z.object({ id: z.string().min(1).max(64), reason: z.number().int() }),
  CheckTransaction: z.object({ id: z.string().min(1).max(64) }),
  GetStatement: z.object({ from: z.number().int(), to: z.number().int() }),
};
type Method = keyof typeof schemas;

type DbAnswer = { result?: Record<string, unknown>; error?: { code: number; data?: string } };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: { id?: RpcId; method?: string; params?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(rpcError(null, -32700));
  }
  const id = body?.id ?? null;

  if (!paymeAuthorized(request.headers.get("authorization"))) {
    const res = rpcError(id, -32504);
    await logPaymentEvent({ provider: "payme", method: body?.method ?? null, payload: body, response: res, orderId: null, error: "auth" });
    return NextResponse.json(res);
  }

  const method = body?.method as Method;
  if (!method || !(method in schemas)) return NextResponse.json(rpcError(id, -32601));
  const parsed = schemas[method].safeParse(body?.params);
  if (!parsed.success) return NextResponse.json(rpcError(id, -32600));
  const p = parsed.data as Record<string, unknown> & { id?: string; account?: { order_id: string } };

  const db = createAdminClient();
  let answer: DbAnswer;
  let orderId: string | null = p.account?.order_id ?? null;

  switch (method) {
    case "CheckPerformTransaction": {
      const v = parsed.data as z.infer<typeof schemas.CheckPerformTransaction>;
      const { data } = await db.rpc("payme_check_order", { p_order_id: v.account.order_id, p_amount_tiyin: v.amount });
      answer = (data as DbAnswer) ?? { error: { code: -31008 } };
      if (answer.result) {
        const { data: o } = await db
          .from("orders")
          .select("courses(title), bundles(title)")
          .eq("id", v.account.order_id)
          .single();
        const detail = paymeReceiptDetail(o?.courses?.title ?? o?.bundles?.title ?? "Kurs", v.amount);
        if (detail) answer.result = { ...answer.result, detail };
      }
      break;
    }
    case "CreateTransaction": {
      const v = parsed.data as z.infer<typeof schemas.CreateTransaction>;
      const { data } = await db.rpc("payme_create", {
        p_tx: v.id,
        p_time: v.time,
        p_amount_tiyin: v.amount,
        p_order_id: v.account.order_id,
      });
      answer = (data as DbAnswer) ?? { error: { code: -31008 } };
      if (answer.result) {
        const r = answer.result;
        answer.result = { create_time: r.create_time, transaction: r.transaction, state: r.state };
      }
      break;
    }
    case "PerformTransaction": {
      const { data } = await db.rpc("payme_perform", { p_tx: p.id! });
      answer = (data as DbAnswer) ?? { error: { code: -31008 } };
      if (answer.result) answer.result = { transaction: answer.result.transaction, perform_time: answer.result.perform_time, state: answer.result.state };
      break;
    }
    case "CancelTransaction": {
      const v = parsed.data as z.infer<typeof schemas.CancelTransaction>;
      const { data } = await db.rpc("payme_cancel", { p_tx: v.id, p_reason: v.reason });
      answer = (data as DbAnswer) ?? { error: { code: -31008 } };
      if (answer.result) answer.result = { transaction: answer.result.transaction, cancel_time: answer.result.cancel_time, state: answer.result.state };
      break;
    }
    case "CheckTransaction": {
      const { data } = await db.rpc("payme_check", { p_tx: p.id! });
      answer = (data as DbAnswer) ?? { error: { code: -31003 } };
      break;
    }
    case "GetStatement": {
      const v = parsed.data as z.infer<typeof schemas.GetStatement>;
      const { data } = await db.rpc("payme_statement", { p_from: v.from, p_to: v.to });
      answer = (data as DbAnswer) ?? { result: { transactions: [] } };
      break;
    }
  }

  // Link Perform/Cancel/Check events to the order.
  if (!orderId && p.id) {
    const { data: pay } = await db.from("payments").select("order_id").eq("provider", "payme").eq("provider_transaction_id", p.id).maybeSingle();
    orderId = pay?.order_id ?? null;
  }

  const response = answer.error ? rpcError(id, answer.error.code, answer.error.data) : { id, result: answer.result as Json };
  await logPaymentEvent({ provider: "payme", method, payload: body, response, orderId, error: answer.error ? String(answer.error.code) : null });
  return NextResponse.json(response);
}
