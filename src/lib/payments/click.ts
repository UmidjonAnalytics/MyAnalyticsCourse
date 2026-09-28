import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { PaymentProvider } from "./types";

// Click (click.uz). Hosted checkout: https://docs.click.uz/click-button/
// Callbacks (Prepare / Complete): src/app/api/payments/click/[action]/route.ts. Amounts in so'm.

function cfg() {
  const env = serverEnv();
  return { serviceId: env.CLICK_SERVICE_ID ?? "", merchantId: env.CLICK_MERCHANT_ID ?? "", secret: env.CLICK_SECRET_KEY ?? "" };
}

export const click: PaymentProvider = {
  name: "click",
  isConfigured: () => Boolean(cfg().serviceId && cfg().merchantId && cfg().secret),
  checkoutUrl(order, returnUrl) {
    const c = cfg();
    const q = new URLSearchParams({
      service_id: c.serviceId,
      merchant_id: c.merchantId,
      amount: order.finalAmount.toFixed(2),
      transaction_param: order.id,
      return_url: returnUrl,
    });
    return `https://my.click.uz/services/pay?${q}`;
  },
};

export type ClickParams = {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
};

/** md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + [merchant_prepare_id] + amount + action + sign_time) */
export function clickSignatureValid(p: ClickParams): boolean {
  const c = cfg();
  if (!c.secret || p.service_id !== c.serviceId) return false;
  const raw =
    p.click_trans_id + p.service_id + c.secret + p.merchant_trans_id + (p.action === "1" ? (p.merchant_prepare_id ?? "") : "") + p.amount + p.action + p.sign_time;
  const expected = createHash("md5").update(raw).digest("hex");
  const given = (p.sign_string ?? "").toLowerCase();
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
