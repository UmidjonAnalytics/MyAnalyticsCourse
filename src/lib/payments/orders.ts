import "server-only";
import type { PromoCode } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { bundlePrice } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

// Price calculation for checkout. Always done on the server (the browser only shows the result).

export type ProductRef = { type: "kurs" | "toplam"; slug: string };

export type Quote = {
  productType: "course" | "bundle";
  productId: string;
  title: string;
  listPrice: number; // course price or bundle price
  upgradeDiscount: number; // bundle: value of courses the student already owns
  promoDiscount: number;
  finalAmount: number;
  promo: { id: string; code: string } | null;
};

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

function promoApplies(p: PromoCode, type: "course" | "bundle", id: string): boolean {
  const a = (p.applies_to ?? {}) as { all?: boolean; courses?: string[]; bundles?: string[] };
  if (a.all) return true;
  return type === "course" ? Boolean(a.courses?.includes(id)) : Boolean(a.bundles?.includes(id));
}

export async function quote(userId: string, ref: ProductRef, promoCode: string | null): Promise<QuoteResult> {
  const db = createAdminClient();
  const now = Date.now();

  const { data: active } = await db.from("enrollments").select("course_id, expires_at").eq("user_id", userId).is("revoked_at", null);
  const owned = new Set((active ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now).map((e) => e.course_id));

  let q: Omit<Quote, "promoDiscount" | "finalAmount" | "promo">;
  if (ref.type === "kurs") {
    const { data: c } = await db
      .from("courses")
      .select("id, title, price")
      .eq("slug", ref.slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (!c) return { ok: false, error: uz.checkout.errors.generic };
    if (owned.has(c.id)) return { ok: false, error: uz.checkout.alreadyOwned };
    q = { productType: "course", productId: c.id, title: c.title, listPrice: c.price, upgradeDiscount: 0 };
  } else {
    const { data: b } = await db
      .from("bundles")
      .select("id, title, price, allow_upgrade_pricing, bundle_courses(courses(id, price, is_published, archived_at))")
      .eq("slug", ref.slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (!b) return { ok: false, error: uz.checkout.errors.generic };
    const courses = b.bundle_courses
      .map((bc) => bc.courses)
      .filter((c) => c && c.is_published && !c.archived_at)
      .map((c) => ({ price: c.price, owned: owned.has(c.id) }));
    const price = bundlePrice({ bundlePrice: b.price, allowUpgradePricing: b.allow_upgrade_pricing, courses });
    if (price.allOwned) return { ok: false, error: uz.checkout.allOwned };
    q = { productType: "bundle", productId: b.id, title: b.title, listPrice: b.price, upgradeDiscount: b.price - price.payPrice };
  }

  const base = q.listPrice - q.upgradeDiscount;
  let promo: Quote["promo"] = null;
  let promoDiscount = 0;
  const code = promoCode?.trim().toUpperCase();
  if (code) {
    const { data: p } = await db.from("promo_codes").select("*").eq("code", code).eq("is_active", true).is("archived_at", null).maybeSingle();
    if (!p || (p.valid_from && new Date(p.valid_from).getTime() > now) || (p.valid_to && new Date(p.valid_to).getTime() < now)) {
      return { ok: false, error: uz.checkout.errors.promoInvalid };
    }
    if (p.usage_limit !== null && p.used_count >= p.usage_limit) return { ok: false, error: uz.checkout.errors.promoUsedUp };
    if (!promoApplies(p, q.productType, q.productId)) return { ok: false, error: uz.checkout.errors.promoNotApplicable };
    promoDiscount = p.discount_type === "percent" ? Math.round((base * p.discount_value) / 100) : Math.min(p.discount_value, base);
    promo = { id: p.id, code: p.code };
  }

  return { ok: true, quote: { ...q, promoDiscount, finalAmount: Math.max(base - promoDiscount, 0), promo } };
}
