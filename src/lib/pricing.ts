// Price rules shared by the bundle page and (Phase 3) checkout. All amounts in so'm.

export type BundlePriceInput = {
  bundlePrice: number;
  allowUpgradePricing: boolean;
  courses: Array<{ price: number; owned: boolean }>;
};

export type BundlePrice = {
  fullPrice: number; // sum of the courses bought one by one
  savings: number; // fullPrice - bundlePrice (never negative)
  ownedCount: number;
  allOwned: boolean;
  /** What this student pays: bundle price, or the reduced upgrade price. */
  payPrice: number;
  isUpgrade: boolean;
};

export function bundlePrice({ bundlePrice, allowUpgradePricing, courses }: BundlePriceInput): BundlePrice {
  const fullPrice = courses.reduce((sum, c) => sum + c.price, 0);
  const owned = courses.filter((c) => c.owned);
  const ownedValue = owned.reduce((sum, c) => sum + c.price, 0);
  const allOwned = courses.length > 0 && owned.length === courses.length;
  // Upgrade (if enabled for the bundle): bundle price minus the list price of the courses the
  // student already owns, never below 0.
  const isUpgrade = allowUpgradePricing && owned.length > 0 && !allOwned;
  const payPrice = isUpgrade ? Math.max(bundlePrice - ownedValue, 0) : bundlePrice;
  return {
    fullPrice,
    savings: Math.max(fullPrice - bundlePrice, 0),
    ownedCount: owned.length,
    allOwned,
    payPrice,
    isUpgrade,
  };
}

// Sale price ("aksiya"): used instead of the list price until sale_ends_at (or until removed).

export type SaleFields = { price: number; sale_price: number | null; sale_ends_at: string | null };
export type CurrentPrice = { price: number; was: number | null; percent: number; endsAt: string | null };

export function currentPrice(p: SaleFields, now = Date.now()): CurrentPrice {
  const active = p.sale_price !== null && p.sale_price < p.price && (!p.sale_ends_at || new Date(p.sale_ends_at).getTime() > now);
  if (!active) return { price: p.price, was: null, percent: 0, endsAt: null };
  return { price: p.sale_price!, was: p.price, percent: Math.round(((p.price - p.sale_price!) / p.price) * 100), endsAt: p.sale_ends_at };
}

/** Whole days and hours left until `endsAt`. */
export function timeLeft(endsAt: string, now = Date.now()): { days: number; hours: number } {
  const ms = Math.max(new Date(endsAt).getTime() - now, 0);
  return { days: Math.floor(ms / 86_400_000), hours: Math.floor((ms % 86_400_000) / 3_600_000) };
}
