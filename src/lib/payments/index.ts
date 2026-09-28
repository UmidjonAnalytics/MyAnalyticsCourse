import "server-only";
import { serverEnv } from "@/lib/env";
import { click } from "./click";
import { payme } from "./payme";
import type { PaymentProvider, ProviderName } from "./types";

// Paynet: waiting for the merchant documentation (we do not guess the protocol). Never offered yet.
const paynet: PaymentProvider = {
  name: "paynet",
  isConfigured: () => false,
  checkoutUrl: () => {
    throw new Error("Paynet is not implemented yet");
  },
};

// Test mode: a fake payment page on our own site. Only when ENABLE_TEST_PAYMENTS=true.
const test: PaymentProvider = {
  name: "test",
  isConfigured: () => serverEnv().ENABLE_TEST_PAYMENTS,
  checkoutUrl: (order) => `/tolov/sinov/${order.id}`,
};

const all: Record<ProviderName, PaymentProvider> = { payme, click, paynet, test };

export function getProvider(name: ProviderName): PaymentProvider {
  return all[name];
}

/** Providers shown at checkout, in this order. Paynet is listed (disabled) so students know it is coming. */
export function checkoutProviders(): Array<{ name: ProviderName; enabled: boolean }> {
  const list: Array<{ name: ProviderName; enabled: boolean }> = (["payme", "click", "paynet"] as const).map((n) => ({
    name: n,
    enabled: all[n].isConfigured(),
  }));
  if (test.isConfigured()) list.push({ name: "test", enabled: true });
  return list;
}

export type { ProviderName, PaymentProvider };
