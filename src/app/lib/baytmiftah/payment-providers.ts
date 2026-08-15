import { clientIntegrations } from "../../../lib/integrations";
import {
  resolvePaymentContext,
  type PaymentContext,
} from "../../../lib/payment-routing.service";

export const PAYMENT_PROVIDERS = ["payangels"] as const;

export function getDefaultProvider() {
  if (clientIntegrations.payangels.checkoutReady) return "payangels";
  return "payangels";
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
  if (provider === "payangels") return { id: provider, label: "Secure checkout" };
  return { id: provider, label: provider };
}
