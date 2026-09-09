/** Mirror of supabase/functions/_shared/payment-pricing.ts for client-side tests. */

export function normalizePaystackAmountMinor(rawAmount: number, expectedMinor: number) {
  const value = Math.round(Number(rawAmount || 0));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Payment amount is missing from provider response");
  }

  if (value === expectedMinor) {
    return value;
  }

  const asMajorMinor = Math.round(value * 100);
  if (asMajorMinor === expectedMinor) {
    return asMajorMinor;
  }

  if (expectedMinor > 0 && value <= Math.max(1, Math.floor(expectedMinor / 50))) {
    return asMajorMinor;
  }

  return value;
}

export function assertPaystackAmountMatch(input: {
  expectedMinor: number;
  paystackAmount: number;
}) {
  const paystackMinor = normalizePaystackAmountMinor(input.paystackAmount, input.expectedMinor);
  if (paystackMinor !== input.expectedMinor) {
    throw new Error("Payment amount does not match transaction record");
  }
}
