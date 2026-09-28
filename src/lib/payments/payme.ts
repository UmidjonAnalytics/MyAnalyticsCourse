import "server-only";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { PaymentProvider } from "./types";

// Payme (paycom.uz). Hosted checkout: https://developer.help.paycom.uz/initsializatsiya-platezhey/
// Merchant API callbacks: src/app/api/payments/payme/route.ts. Amounts to Payme are in tiyin (so'm x 100).

export const PAYME_MESSAGES: Record<number, { uz: string; ru: string; en: string }> = {
  [-31001]: { uz: "Summa noto'g'ri", ru: "Неверная сумма", en: "Wrong amount" },
  [-31003]: { uz: "Tranzaksiya topilmadi", ru: "Транзакция не найдена", en: "Transaction not found" },
  [-31007]: { uz: "Bekor qilib bo'lmaydi", ru: "Невозможно отменить", en: "Unable to cancel" },
  [-31008]: { uz: "Amalni bajarib bo'lmaydi", ru: "Невозможно выполнить операцию", en: "Unable to perform operation" },
  [-31050]: { uz: "Buyurtma topilmadi", ru: "Заказ не найден", en: "Order not found" },
  [-31051]: { uz: "Buyurtma to'langan yoki to'lov kutilmoqda", ru: "Заказ уже оплачен или ожидает оплаты", en: "Order already paid or awaiting payment" },
  [-32300]: { uz: "Faqat POST", ru: "Только POST", en: "POST only" },
  [-32504]: { uz: "Ruxsat yo'q", ru: "Недостаточно привилегий", en: "Insufficient privileges" },
  [-32600]: { uz: "So'rov noto'g'ri", ru: "Неверный запрос", en: "Invalid request" },
  [-32601]: { uz: "Metod topilmadi", ru: "Метод не найден", en: "Method not found" },
  [-32700]: { uz: "JSON xato", ru: "Ошибка разбора JSON", en: "Parse error" },
};

function cfg() {
  const env = serverEnv();
  return {
    merchantId: env.PAYME_MERCHANT_ID ?? "",
    key: env.PAYME_KEY ?? "",
    test: env.PAYME_TEST,
    checkoutBase: env.PAYME_TEST ? "https://test.paycom.uz" : "https://checkout.paycom.uz",
    apiUrl: env.PAYME_TEST ? "https://checkout.test.paycom.uz/api" : "https://checkout.paycom.uz/api",
  };
}

export const payme: PaymentProvider = {
  name: "payme",
  isConfigured: () => Boolean(cfg().merchantId && cfg().key),
  checkoutUrl(order, returnUrl) {
    const c = cfg();
    const params = [`m=${c.merchantId}`, `ac.order_id=${order.id}`, `a=${order.finalAmount * 100}`, `c=${returnUrl}`, "l=uz"].join(";");
    return `${c.checkoutBase}/${Buffer.from(params).toString("base64")}`;
  },
};

/** Payme calls us with "Authorization: Basic base64(Paycom:<KEY>)". */
export function paymeAuthorized(header: string | null): boolean {
  const key = cfg().key;
  if (!key || !header?.startsWith("Basic ")) return false;
  const given = Buffer.from(header.slice(6), "base64");
  const expected = Buffer.from(`Paycom:${key}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function paymeCardFormEnabled(): boolean {
  return payme.isConfigured() && serverEnv().PAYME_CARD_FORM;
}

/** Public values for the on-site card form (the merchant id is not a secret). */
export function paymeCardConfig() {
  const c = cfg();
  return { merchantId: c.merchantId, apiUrl: c.apiUrl };
}

/** Optional fiscal receipt detail (required by Payme once your cashbox has fiscalization). */
export function paymeReceiptDetail(title: string, amountTiyin: number) {
  const env = serverEnv();
  if (!env.PAYME_IKPU_CODE || !env.PAYME_PACKAGE_CODE) return undefined;
  return {
    receipt_type: 0,
    items: [{ title, price: amountTiyin, count: 1, code: env.PAYME_IKPU_CODE, package_code: env.PAYME_PACKAGE_CODE, vat_percent: 0 }],
  };
}

type RpcResult<T> = { ok: true; result: T } | { ok: false; code: number; message: string };

/** Server-to-server Subscribe API call (receipts.*), authorised with "id:key". */
export async function paymeSubscribe<T>(method: string, params: Record<string, unknown>): Promise<RpcResult<T>> {
  const c = cfg();
  const res = await fetch(c.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Auth": `${c.merchantId}:${c.key}` },
    body: JSON.stringify({ id: Date.now(), method, params }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { result?: T; error?: { code: number; message: string } } | null;
  if (!json) return { ok: false, code: -1, message: `HTTP ${res.status}` };
  if (json.error) return { ok: false, code: json.error.code, message: String(json.error.message) };
  return { ok: true, result: json.result as T };
}
