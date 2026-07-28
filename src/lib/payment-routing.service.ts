import { clientIntegrations } from "./integrations";
import { resolveJurisdiction, type JurisdictionId } from "./real-estate-compliance";

export type PaymentProviderId = "paystack" | "stripe";

const JURISDICTION_CURRENCY: Record<JurisdictionId, string> = {
  GH: "GHS",
  NG: "NGN",
  KE: "KES",
  ZA: "ZAR",
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  CA: "CAD",
  AU: "AUD",
  AE: "AED",
  IN: "INR",
  GLOBAL: "USD",
};

/** Markets where Paystack is the primary checkout provider. */
const PAYSTACK_JURISDICTIONS = new Set<JurisdictionId>(["GH", "NG", "KE", "ZA"]);

export interface PaymentContext {
  jurisdictionId: JurisdictionId;
  region: string;
  currency: string;
  primaryProvider: PaymentProviderId;
  providerLabel: string;
  propertyLabel: string;
  checkoutReady: boolean;
}

export function resolvePaymentContext(input: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  currency?: string | null;
}): PaymentContext {
  const jurisdictionId = resolveJurisdiction(input);
  const region = jurisdictionId === "GLOBAL" ? "GLOBAL" : jurisdictionId;
  const currency =
    input.currency?.trim().toUpperCase() || JURISDICTION_CURRENCY[jurisdictionId] || "USD";

  const primaryProvider: PaymentProviderId = PAYSTACK_JURISDICTIONS.has(jurisdictionId)
    ? "paystack"
    : "stripe";

  const propertyLabel =
    [input.city, input.region, input.country].filter(Boolean).join(", ") || "this property";

  const checkoutReady =
    primaryProvider === "paystack"
      ? clientIntegrations.paystack.checkoutReady
      : clientIntegrations.stripe.configured;

  return {
    jurisdictionId,
    region,
    currency,
    primaryProvider,
    providerLabel: primaryProvider === "paystack" ? "Paystack" : "Stripe",
    propertyLabel,
    checkoutReady,
  };
}

export function resolvePaymentContextFromListing(
  listing?: {
    currency?: string | null;
    property?:
      | {
          country?: string | null;
          region?: string | null;
          city?: string | null;
          address?: string | null;
        }
      | Array<{
          country?: string | null;
          region?: string | null;
          city?: string | null;
          address?: string | null;
        }>
      | null;
  } | null
): PaymentContext {
  const rawProperty = listing?.property;
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty;
  return resolvePaymentContext({
    country: property?.country,
    region: property?.region,
    city: property?.city || property?.address,
    currency: listing?.currency,
  });
}

export function shouldUsePaystackCheckout(context: PaymentContext) {
  return context.primaryProvider === "paystack";
}

export function getPreferredProviderIds(context: PaymentContext): string[] {
  if (context.primaryProvider === "paystack") {
    return clientIntegrations.paystack.checkoutReady ? ["paystack"] : [];
  }
  return clientIntegrations.stripe.configured ? ["stripe"] : [];
}
