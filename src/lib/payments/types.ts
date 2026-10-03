// Every payment provider (Payme, Click, Paynet, Uzum, test) is one module implementing this.
export type ProviderName = "payme" | "click" | "paynet" | "uzum" | "test";

export type CheckoutOrder = { id: string; number: number; finalAmount: number; title: string };

export interface PaymentProvider {
  readonly name: ProviderName;
  /** Keys are set, so the provider can be offered at checkout. */
  isConfigured(): boolean;
  /** Where to send the browser to pay (hosted checkout page). */
  checkoutUrl(order: CheckoutOrder, returnUrl: string): string;
}
