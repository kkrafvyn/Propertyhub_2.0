import { clientIntegrations } from "../../../lib/integrations";

export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"] as const;

export function getDefaultProvider() {
  if (clientIntegrations.paystack.checkoutReady) return "paystack";
  if (clientIntegrations.flutterwave.configured) return "flutterwave";
  return "paystack";
}

export function providerMeta(provider: string) {
  return { id: provider, label: provider };
}
