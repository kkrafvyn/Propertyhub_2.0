import { clientIntegrations } from "./integrations";
import { resolveJurisdiction, type JurisdictionId } from "./real-estate-compliance";

export type PaymentProviderId = "payangels";

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

/** Markets where PayAngels is the primary checkout provider. */
const PAYANGELS_JURISDICTIONS = new Set<JurisdictionId>(["GH", "NG", "KE", "ZA"]);

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

  // All markets now route to PayAngels as the single provider.
  const primaryProvider: PaymentProviderId = "payangels";

  const propertyLabel =
    [input.city, input.region, input.country].filter(Boolean).join(", ") || "this property";

  const checkoutReady = clientIntegrations.payangels.checkoutReady;

  return {
    jurisdictionId,
    region,
    currency,
    primaryProvider,
    providerLabel: "Secure checkout",
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

export function shouldUsePayangelsCheckout(context: PaymentContext) {
  return context.primaryProvider === "payangels";
}

// Backwards-compatible alias for existing imports
export function shouldUsePaystackCheckout(context: PaymentContext) {
  return shouldUsePayangelsCheckout(context);
}

export function getPreferredProviderIds(context: PaymentContext): string[] {
  return clientIntegrations.payangels.checkoutReady ? ["payangels"] : [];
}
