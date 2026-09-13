import { calculateCountryTaxes, type CountryContext } from "./country-rules";
import type { TaxLineInput } from "./country-rules/types";
import {
  buildPropertyComplianceSnapshot,
  resolvePropertyCountryContext,
  type PropertyLocationInput,
} from "./property-country-context.service";
import type { CountryCode } from "./country-rules";
import { countryRulesService } from "./country-rules.service";
import {
  revenueManagementService,
  type CheckoutPricingPreview,
} from "./revenue-management.service";

export type PropertyCheckoutPricing = CheckoutPricingPreview & {
  jurisdictionId: string;
  subdivisionLabel?: string;
  currency: string;
  taxMinor: number;
  taxLines: Array<{ id: string; label: string; amountMinor: number }>;
  totalWithTaxMinor: number;
};

export function taxLinesForPurpose(
  purpose: string,
  baseMinor: number,
  platformFeeMinor: number
): TaxLineInput[] {
  const lines: TaxLineInput[] = [];

  if (purpose === "rent" || purpose === "lease_fee" || purpose === "deposit") {
    lines.push({ category: "rent", amountMinor: baseMinor });
  } else if (purpose === "booking_fee" || purpose === "inspection_fee") {
    lines.push({ category: "short_stay", amountMinor: baseMinor });
  } else if (purpose === "purchase_installment") {
    lines.push({ category: "sale", amountMinor: baseMinor });
  }

  if (platformFeeMinor > 0) {
    lines.push({ category: "service_fee", amountMinor: platformFeeMinor });
  }

  return lines;
}

export function resolveCheckoutCountryContext(
  property?: PropertyLocationInput | null,
  org?: {
    default_jurisdiction?: string | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  }
): CountryContext {
  if (!property) {
    return resolvePropertyCountryContext({}, org as any);
  }
  return resolvePropertyCountryContext(property, org as any);
}

export function computePropertyTaxes(
  property: PropertyLocationInput | null | undefined,
  purpose: string,
  baseMinor: number,
  platformFeeMinor: number,
  org?: {
    default_jurisdiction?: string | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  }
) {
  const snapshot = buildPropertyComplianceSnapshot(property ?? {}, org as {
    default_jurisdiction?: CountryCode | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  } | undefined);
  const taxInput = taxLinesForPurpose(purpose, baseMinor, platformFeeMinor);
  if (!taxInput.length) {
    return { snapshot, taxMinor: 0, taxLines: [] as Array<{ id: string; label: string; amountMinor: number }> };
  }
  const taxResult = calculateCountryTaxes(snapshot.context, taxInput);
  return {
    snapshot,
    taxMinor: taxResult.totalTaxMinor,
    taxLines: taxResult.components.map((c) => ({
      id: c.id,
      label: c.label,
      amountMinor: c.amountMinor,
    })),
  };
}

/** Checkout pricing with property-aware jurisdiction, platform fees, and statutory tax components. */
export async function previewPropertyCheckoutPricing(input: {
  baseAmountMajor: number;
  purpose: string;
  promoCode?: string | null;
  property?: PropertyLocationInput | null;
  organizationId?: string | null;
}): Promise<PropertyCheckoutPricing> {
  let orgSettings = null;

  if (input.organizationId) {
    orgSettings = await countryRulesService.getOrganizationSettings(input.organizationId).catch(() => null);
  }

  const context = resolvePropertyCountryContext(input.property ?? {}, orgSettings ?? undefined);

  const basePreview = await revenueManagementService.previewCheckoutPricing({
    baseAmountMajor: input.baseAmountMajor,
    purpose: input.purpose,
    promoCode: input.promoCode,
    jurisdictionId: context.jurisdictionId,
    organizationId: input.organizationId,
    orgCollectPlatformFees: orgSettings?.collect_platform_fees,
    orgCollectCheckoutTaxes: orgSettings?.collect_checkout_taxes,
  });

  const taxFeeBase = basePreview.buyerPlatformFeeMinor + basePreview.providerPlatformFeeMinor;
  const { snapshot, taxMinor, taxLines } = basePreview.taxesEnabled
    ? computePropertyTaxes(
        input.property,
        input.purpose,
        basePreview.baseMinor,
        taxFeeBase,
        orgSettings ?? undefined,
      )
    : {
        snapshot: buildPropertyComplianceSnapshot(input.property ?? {}, orgSettings ?? undefined),
        taxMinor: 0,
        taxLines: [] as Array<{ id: string; label: string; amountMinor: number }>,
      };

  return {
    ...basePreview,
    jurisdictionId: snapshot.context.jurisdictionId,
    subdivisionLabel: snapshot.subdivisionLabel,
    currency: snapshot.context.currency,
    taxMinor,
    taxLines,
    totalWithTaxMinor: basePreview.totalMinor + taxMinor,
  };
}

export const propertyCheckoutPricingService = {
  previewPropertyCheckoutPricing,
  resolveCheckoutCountryContext,
  taxLinesForPurpose,
  computePropertyTaxes,
};
