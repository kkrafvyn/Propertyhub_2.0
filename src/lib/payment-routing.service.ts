import { clientIntegrations } from "./integrations";
import {
  getAvailablePaymentRails,
  resolveCountryContext,
  type CountryCode,
} from "./country-rules";
import { isPayAngelsWorldwideRail } from "./country-rules/payangels-rails";
import { resolveJurisdiction, type JurisdictionId } from "./real-estate-compliance";
import { resolveEffectiveSubdivision } from "./property-country-context.service";
import { resolveSubdivisionCode } from "./country-rules/subdivision-resolver";

/** PayAngels is the sole primary checkout provider worldwide. */
export type PaymentProviderId = "payangels" | "momo_mtn" | "mpesa" | "bank_transfer";

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

export interface PaymentContext {
  jurisdictionId: JurisdictionId;
  region: string;
  currency: string;
  primaryProvider: PaymentProviderId;
  providerLabel: string;
  propertyLabel: string;
  checkoutReady: boolean;
  availableRails: ReturnType<typeof getAvailablePaymentRails>;
}

export function resolvePaymentContext(input: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  currency?: string | null;
  subdivisionCode?: string | null;
  propertySubdivisionCode?: string | null;
}): PaymentContext {
  const jurisdictionId = resolveJurisdiction({
    country: input.country,
    region: input.region,
    city: input.city,
  });

  const { code: effectiveSubdivision } = resolveEffectiveSubdivision(
    jurisdictionId,
    {
      country: input.country,
      region: input.region,
      city: input.city,
      subdivision_code: input.propertySubdivisionCode || input.subdivisionCode,
    },
    input.subdivisionCode
  );

  const countryContext = resolveCountryContext({
    country: input.country,
    region: input.region,
    city: input.city,
    subdivisionCode:
      effectiveSubdivision ||
      resolveSubdivisionCode(jurisdictionId, input.region, input.city),
    currency: input.currency,
  });

  const resolvedId = countryContext.jurisdictionId;
  const region = resolvedId === "GLOBAL" ? "GLOBAL" : resolvedId;
  const currency =
    input.currency?.trim().toUpperCase() ||
    countryContext.currency ||
    JURISDICTION_CURRENCY[resolvedId] ||
    "USD";

  const availableRails = getAvailablePaymentRails(countryContext, "rent");

  const propertyLabel =
    [input.city, input.region, input.country].filter(Boolean).join(", ") || "this property";

  return {
    jurisdictionId: resolvedId,
    region,
    currency,
    primaryProvider: "payangels",
    providerLabel: "PayAngels",
    propertyLabel,
    checkoutReady: clientIntegrations.payangels.checkoutReady,
    availableRails,
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
    propertySubdivisionCode: (property as { subdivision_code?: string | null })?.subdivision_code,
  });
}

export function shouldUsePayangelsCheckout(_context?: PaymentContext) {
  return true;
}

export function shouldUsePaystackCheckout(context: PaymentContext) {
  return shouldUsePayangelsCheckout(context);
}

export function getPreferredProviderIds(context: PaymentContext): string[] {
  if (clientIntegrations.payangels.checkoutReady) {
    return ["payangels", ...context.availableRails.map((r) => r.id).filter((id) => !isPayAngelsWorldwideRail(id))];
  }
  return context.availableRails.map((r) => r.id);
}

export type { CountryCode };
