"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { uz } from "@/lib/i18n/uz";
import { getProvider, type ProviderName } from "@/lib/payments";
import { quote, type Quote } from "@/lib/payments/orders";
import { REFERRAL_COOKIE } from "@/lib/referral";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const refSchema = z.object({ type: z.enum(["kurs", "toplam"]), slug: z.string().regex(/^[a-z0-9-]{1,100}$/) });
const promoSchema = z.string().trim().max(40).nullable();

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("phone_verified").eq("id", id).single();
  return { id, phoneVerified: Boolean(profile?.phone_verified) };
}

export async function getQuote(
  ref: z.input<typeof refSchema>,
  promo: string | null,
): Promise<{ ok: true; quote: Quote } | { ok: false; error: string }> {
  const r = refSchema.safeParse(ref);
  const p = promoSchema.safeParse(promo);
  if (!r.success || !p.success) return { ok: false, error: uz.checkout.errors.generic };
  const user = await currentUser();
  if (!user) return { ok: false, error: uz.errors.notLoggedIn };
  if (!(await rateLimit(`quote:${user.id}`, 30, 60))) return { ok: false, error: uz.checkout.errors.tooMany };
  const res = await quote(user.id, r.data, p.data, await referralCode());
  return res.ok ? { ok: true, quote: res.quote } : res;
}

/** Invite code from the friend's link (cookie set by /taklif/[code]). */
async function referralCode(): Promise<string | null> {
  return (await cookies()).get(REFERRAL_COOKIE)?.value ?? null;
}

const startSchema = z.object({
  ref: refSchema,
  promo: promoSchema,
  provider: z.enum(["payme", "click", "paynet", "uzum", "test"]),
  card: z.boolean().default(false),
});

/** Creates the order and returns where to send the browser (provider page, card form or result). */
export async function startCheckout(
  input: z.input<typeof startSchema>,
): Promise<{ ok: true; url: string; orderId: string } | { ok: false; error: string }> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: uz.checkout.errors.generic };
  const { ref, promo, provider: providerName } = parsed.data;

  const user = await currentUser();
  if (!user) return { ok: false, error: uz.errors.notLoggedIn };
  if (!user.phoneVerified) return { ok: false, error: uz.checkout.phoneRequired };
  if (!(await rateLimit(`checkout:${user.id}`, 10, 600))) return { ok: false, error: uz.checkout.errors.tooMany };

  const provider = getProvider(providerName as ProviderName);
  if (!provider.isConfigured()) return { ok: false, error: uz.checkout.errors.provider };

  const q = await quote(user.id, ref, promo, await referralCode());
  if (!q.ok) return q;
  const { quote: v } = q;

  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .insert({
      user_id: user.id,
      product_type: v.productType,
      course_id: v.productType === "course" ? v.productId : null,
      bundle_id: v.productType === "bundle" ? v.productId : null,
      amount: v.listPrice,
      discount: v.saleDiscount + v.upgradeDiscount + v.promoDiscount + v.referralDiscount,
      final_amount: v.finalAmount,
      promo_code_id: v.promo?.id ?? null,
      referrer_id: q.referrerId,
      provider: v.finalAmount === 0 ? "free" : providerName,
    })
    .select("id, number")
    .single();
  if (error || !order) {
    console.error("order insert failed", error?.message);
    return { ok: false, error: uz.checkout.errors.generic };
  }

  const resultPath = `/tolov/natija/${order.id}`;
  // 100% discount: nothing to pay, grant access right away.
  if (v.finalAmount === 0) {
    const { error: freeErr } = await db.rpc("order_mark_paid", { p_order_id: order.id, p_provider: "free" });
    if (freeErr) return { ok: false, error: uz.checkout.errors.generic };
    return { ok: true, url: resultPath, orderId: order.id };
  }

  if (parsed.data.card && providerName === "payme") return { ok: true, url: `/tolov/karta/${order.id}`, orderId: order.id };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const url = provider.checkoutUrl({ id: order.id, number: order.number, finalAmount: v.finalAmount, title: v.title }, origin + resultPath);
  return { ok: true, url, orderId: order.id };
}

/** Test mode only: finish or cancel an order from the fake payment page. */
export async function testPay(orderId: string, success: boolean): Promise<{ ok: boolean }> {
  if (!serverEnv().ENABLE_TEST_PAYMENTS || !z.uuid().safeParse(orderId).success) return { ok: false };
  const user = await currentUser();
  if (!user) return { ok: false };
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("user_id").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return { ok: false };
  const { error } = await db.rpc("test_payment", { p_order_id: orderId, p_success: success });
  return { ok: !error };
}
