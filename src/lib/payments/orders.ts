import "server-only";
import type { PromoCode } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { bundlePrice, currentPrice } from "@/lib/pricing";
import { REFERRAL_CODE } from "@/lib/referral";
import { createAdminClient } from "@/lib/supabase/admin";

// Price calculation for checkout. Always done on the server (the browser only shows the result).

export type ProductRef = { type: "kurs" | "toplam"; slug: string };

export type Quote = {
  productType: "course" | "bundle";
  productId: string;
  title: string;
  listPrice: number; // course price or bundle price
  saleDiscount: number; // active sale price ("aksiya")
  upgradeDiscount: number; // bundle: value of courses the student already owns
  promoDiscount: number;
  referralDiscount: number; // first purchase through a friend's invite link
  referralPercent: number;
  finalAmount: number;
  promo: { id: string; code: string } | null;
};

// referrerId stays on the server (it is stored on the order, never sent to the browser).
export type QuoteResult = { ok: true; quote: Quote; referrerId: string | null } | { ok: false; error: string };

function promoApplies(p: PromoCode, type: "course" | "bundle", id: string): boolean {
  const a = (p.applies_to ?? {}) as { all?: boolean; courses?: string[]; bundles?: string[] };
  if (a.all) return true;
  return type === "course" ? Boolean(a.courses?.includes(id)) : Boolean(a.bundles?.includes(id));
}

export async function quote(userId: string, ref: ProductRef, promoCode: string | null, referralCode: string | null = null): Promise<QuoteResult> {
  const db = createAdminClient();
  const now = Date.now();

  const { data: active } = await db.from("enrollments").select("course_id, expires_at").eq("user_id", userId).is("revoked_at", null);
  const owned = new Set((active ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id));

  let q: Omit<Quote, "promoDiscount" | "referralDiscount" | "referralPercent" | "finalAmount" | "promo">;
  if (ref.type === "kurs") {
    const { data: c } = await db
      .from("courses")
      .select("id, title, price, sale_price, sale_ends_at")
      .eq("slug", ref.slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (!c) return { ok: false, error: uz.checkout.errors.generic };
    if (owned.has(c.id)) return { ok: false, error: uz.checkout.alreadyOwned };
    const sale = currentPrice(c, now);
    q = { productType: "course", productId: c.id, title: c.title, listPrice: c.price, saleDiscount: c.price - sale.price, upgradeDiscount: 0 };
  } else {
    const { data: b } = await db
      .from("bundles")
      .select("id, title, price, sale_price, sale_ends_at, allow_upgrade_pricing, bundle_courses(courses(id, price, is_published, archived_at))")
      .eq("slug", ref.slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (!b) return { ok: false, error: uz.checkout.errors.generic };
    const courses = b.bundle_courses
      .map((bc) => bc.courses)
      .filter((c) => c && c.is_published && !c.archived_at)
      .map((c) => ({ price: c.price, owned: owned.has(c.id) }));
    const sale = currentPrice(b, now);
    const price = bundlePrice({ bundlePrice: sale.price, allowUpgradePricing: b.allow_upgrade_pricing, courses });
    if (price.allOwned) return { ok: false, error: uz.checkout.allOwned };
    q = {
      productType: "bundle",
      productId: b.id,
      title: b.title,
      listPrice: b.price,
      saleDiscount: b.price - sale.price,
      upgradeDiscount: sale.price - price.payPrice,
    };
  }

  const base = q.listPrice - q.saleDiscount - q.upgradeDiscount;
  let promo: Quote["promo"] = null;
  let promoDiscount = 0;
  const code = promoCode?.trim().toUpperCase();
  if (code) {
    const { data: p } = await db.from("promo_codes").select("*").eq("code", code).eq("is_active", true).is("archived_at", null).maybeSingle();
    if (!p || (p.valid_from && new Date(p.valid_from).getTime() > now) || (p.valid_to && new Date(p.valid_to).getTime() < now)) {
      return { ok: false, error: uz.checkout.errors.promoInvalid };
    }
    if (p.owner_id && p.owner_id !== userId) return { ok: false, error: uz.checkout.errors.promoInvalid };
    if (p.usage_limit !== null && p.used_count >= p.usage_limit) return { ok: false, error: uz.checkout.errors.promoUsedUp };
    if (!promoApplies(p, q.productType, q.productId)) return { ok: false, error: uz.checkout.errors.promoNotApplicable };
    promoDiscount = p.discount_type === "percent" ? Math.round((base * p.discount_value) / 100) : Math.min(p.discount_value, base);
    promo = { id: p.id, code: p.code };
  }

  // Friend's invite: only for the first purchase and only when no promo code is entered.
  let referrerId: string | null = null;
  let referralPercent = 0;
  const refCode = referralCode?.trim().toUpperCase();
  if (!promo && refCode && REFERRAL_CODE.test(refCode) && base > 0) {
    const [{ data: settings }, { data: referrer }, { count: previous }] = await Promise.all([
      db.from("site_settings").select("referral_enabled, referral_friend_percent").eq("id", 1).maybeSingle(),
      db.from("profiles").select("id").eq("referral_code", refCode).maybeSingle(),
      db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["paid", "refunded"]),
    ]);
    if (settings?.referral_enabled && settings.referral_friend_percent > 0 && referrer && referrer.id !== userId && (previous ?? 0) === 0) {
      referrerId = referrer.id;
      referralPercent = settings.referral_friend_percent;
    }
  }
  const referralDiscount = Math.round((base * referralPercent) / 100);

  return {
    ok: true,
    quote: { ...q, promoDiscount, referralDiscount, referralPercent, finalAmount: Math.max(base - promoDiscount - referralDiscount, 0), promo },
    referrerId,
  };
}
