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
