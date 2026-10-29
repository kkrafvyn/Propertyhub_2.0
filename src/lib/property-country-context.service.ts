import {
  resolveCountryContext,
  type CountryCode,
  type CountryContext,
} from "./country-rules";
import { resolveSubdivisionCode, subdivisionLabel } from "./country-rules/subdivision-resolver";
import { resolveJurisdiction } from "./real-estate-compliance";
import { countryRulesService } from "./country-rules.service";
import { getJurisdictionRules } from "./real-estate-compliance";
import type { ListingType } from "./real-estate-compliance";

export type PropertyLocationInput = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  subdivision_code?: string | null;
  currency?: string | null;
  ghana_post_gps?: string | null;
};

export type PropertyComplianceSnapshot = {
  context: CountryContext;
  jurisdictionId: CountryCode;
  subdivisionCode?: string;
  subdivisionLabel?: string;
  subdivisionSource: "property" | "address" | "organization" | "none";
  governingLaw: string;
  leaseHighlights: string[];
  taxComponents: CountryContext["effectiveTaxProfile"];
  paymentLabel: string;
};

/**
 * Resolve subdivision with priority: property override → address auto-detect → org default.
 */
export function resolveEffectiveSubdivision(
  jurisdictionId: CountryCode,
  property: PropertyLocationInput,
  orgSubdivision?: string | null
): { code?: string; source: PropertyComplianceSnapshot["subdivisionSource"] } {
  const explicit = property.subdivision_code?.trim().toUpperCase();
  if (explicit) return { code: explicit, source: "property" };

  const auto = resolveSubdivisionCode(jurisdictionId, property.region, property.city);
  if (auto) return { code: auto, source: "address" };

  const org = orgSubdivision?.trim().toUpperCase();
  if (org) return { code: org, source: "organization" };

  return { source: "none" };
}

export function resolvePropertyCountryContext(
  property: PropertyLocationInput,
  org?: {
    default_jurisdiction?: CountryCode | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  }
): CountryContext {
  const jurisdictionId: CountryCode =
    org?.default_jurisdiction ||
    resolveJurisdiction({
      country: property.country,
      region: property.region,
      city: property.city,
    });

  const { code: subdivisionCode } = resolveEffectiveSubdivision(
    jurisdictionId,
    property,
    org?.default_subdivision
  );

  return resolveCountryContext({
    country: property.country,
    region: property.region,
    city: property.city,
    subdivisionCode,
    currency: property.currency || org?.default_currency,
    organizationJurisdiction: org?.default_jurisdiction,
  });
}

export async function resolvePropertyCountryContextForOrg(
  organizationId: string,
  property: PropertyLocationInput
): Promise<CountryContext> {
  const settings = await countryRulesService.getOrganizationSettings(organizationId).catch(() => null);
  return resolvePropertyCountryContext(property, settings ?? undefined);
}

export function buildPropertyComplianceSnapshot(
  property: PropertyLocationInput,
  org?: {
    default_jurisdiction?: CountryCode | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  },
  listingType: ListingType = "rental"
): PropertyComplianceSnapshot {
  const jurisdictionId: CountryCode =
    org?.default_jurisdiction ||
    resolveJurisdiction({
      country: property.country,
      region: property.region,
      city: property.city,
    });

  const { code: subdivisionCode, source: subdivisionSource } = resolveEffectiveSubdivision(
    jurisdictionId,
    property,
    org?.default_subdivision
  );

  const context = resolvePropertyCountryContext(property, org);
  const rules = getJurisdictionRules(context.jurisdictionId);
  const lease = context.pack.leaseRules;

  const leaseHighlights: string[] = [];
  if (lease.maxSecurityDepositMonths != null) {
    leaseHighlights.push(`Max deposit: ${lease.maxSecurityDepositMonths} months`);
  }
  if (lease.maxAdvanceRentMonths != null) {
    leaseHighlights.push(`Max advance rent: ${lease.maxAdvanceRentMonths} months`);
  }
  if (lease.rentControlApplies) {
    leaseHighlights.push("Rent control may apply");
  }
  if (lease.minNoticeDaysLandlord != null) {
    leaseHighlights.push(`Landlord notice: ${lease.minNoticeDaysLandlord} days min`);
  }

  return {
    context,
    jurisdictionId: context.jurisdictionId,
    subdivisionCode,
    subdivisionLabel: subdivisionCode ? subdivisionLabel(jurisdictionId, subdivisionCode) : undefined,
    subdivisionSource,
    governingLaw: rules.governingLaw,
    leaseHighlights,
    taxComponents: context.effectiveTaxProfile.filter((t) => t.rateBasisPoints > 0 || t.notes),
    paymentLabel: context.currency,
  };
}

export const propertyCountryContextService = {
  resolveEffectiveSubdivision,
  resolvePropertyCountryContext,
  resolvePropertyCountryContextForOrg,
  buildPropertyComplianceSnapshot,
};
