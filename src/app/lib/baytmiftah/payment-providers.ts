import { clientIntegrations } from "../../../lib/integrations";
import {
  resolvePaymentContext,
  type PaymentContext,
} from "../../../lib/payment-routing.service";

export const PAYMENT_PROVIDERS = ["paystack", "stripe"] as const;

export function getDefaultProvider() {
  if (clientIntegrations.paystack.checkoutReady) return "paystack";
  if (clientIntegrations.stripe.configured) return "stripe";
  return "paystack";
}

export function getProviderForProperty(property?: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  currency?: string | null;
}): PaymentContext {
  return resolvePaymentContext(property || {});
}

export function providerMeta(provider: string) {
  if (provider === "paystack") return { id: provider, label: "Paystack" };
  if (provider === "stripe") return { id: provider, label: "Stripe" };
  return { id: provider, label: provider };
}
