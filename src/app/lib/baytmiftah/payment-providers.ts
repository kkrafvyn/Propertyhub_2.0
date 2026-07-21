export const PAYMENT_PROVIDERS = ["paystack", "flutterwave"] as const;

export function getDefaultProvider() {
  return "paystack";
}

export function providerMeta(provider: string) {
  return { id: provider, label: provider };
}
