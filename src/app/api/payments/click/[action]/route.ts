import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clickSignatureValid, type ClickParams } from "@/lib/payments/click";
import { logPaymentEvent } from "@/lib/payments/events";
import { createAdminClient } from "@/lib/supabase/admin";

// Click Shop API. Set these URLs in the Click merchant cabinet:
//   Prepare:  https://<domain>/api/payments/click/prepare
//   Complete: https://<domain>/api/payments/click/complete
// Requests are application/x-www-form-urlencoded and signed with sign_string (md5).

const NOTES: Record<number, string> = {
  0: "Success",
  [-1]: "SIGN CHECK FAILED!",
  [-2]: "Incorrect parameter amount",
  [-3]: "Action not found",
  [-4]: "Already paid",
  [-5]: "User does not exist",
  [-6]: "Transaction does not exist",
  [-7]: "Failed to update user",
  [-8]: "Error in request from click",
  [-9]: "Transaction cancelled",
};

const schema = z.object({
  click_trans_id: z.string().regex(/^\d{1,20}$/),
  service_id: z.string().max(20),
  click_paydoc_id: z.string().max(40).optional(),
  merchant_trans_id: z.string().max(64),
  merchant_prepare_id: z.string().max(20).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  action: z.enum(["0", "1"]),
  error: z.string().regex(/^-?\d+$/),
  error_note: z.string().max(500).optional(),
  sign_time: z.string().max(40),
  sign_string: z.string().max(64),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const form = Object.fromEntries(new URLSearchParams(await request.text()));
  const parsed = schema.safeParse(form);

  const reply = async (error: number, extra: Record<string, unknown> = {}, orderId: string | null = null) => {
    const body = {
      click_trans_id: form.click_trans_id ? Number(form.click_trans_id) : null,
      merchant_trans_id: form.merchant_trans_id ?? null,
      ...extra,
      error,
      error_note: NOTES[error] ?? "Error",
    };
    await logPaymentEvent({ provider: "click", method: action, payload: form, response: body, orderId, error: error === 0 ? null : String(error) });
    return NextResponse.json(body);
  };

  if (!parsed.success) return reply(-8);
  const p = parsed.data;
  if ((action === "prepare" && p.action !== "0") || (action === "complete" && p.action !== "1") || !["prepare", "complete"].includes(action)) {
    return reply(-3, {}, p.merchant_trans_id);
  }
  if (!clickSignatureValid(p as ClickParams)) return reply(-1, {}, p.merchant_trans_id);

  const db = createAdminClient();
  if (action === "prepare") {
    const { data } = await db.rpc("click_prepare", {
      p_click_trans_id: p.click_trans_id,
      p_order_id: p.merchant_trans_id,
      p_amount: Number(p.amount),
    });
    const r = (data ?? { error: -7 }) as { error: number; prepare_id?: number };
    return reply(r.error, r.error === 0 ? { merchant_prepare_id: r.prepare_id } : {}, p.merchant_trans_id);
  }

  if (!p.merchant_prepare_id || !/^\d+$/.test(p.merchant_prepare_id)) return reply(-6, {}, p.merchant_trans_id);
  const { data } = await db.rpc("click_complete", {
    p_click_trans_id: p.click_trans_id,
    p_prepare_id: Number(p.merchant_prepare_id),
    p_order_id: p.merchant_trans_id,
    p_amount: Number(p.amount),
    p_click_error: Number(p.error),
  });
  const r = (data ?? { error: -7 }) as { error: number; confirm_id?: number };
  return reply(r.error, r.error === 0 ? { merchant_confirm_id: r.confirm_id } : {}, p.merchant_trans_id);
}
