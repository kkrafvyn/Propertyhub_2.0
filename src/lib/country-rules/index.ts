import { resolveJurisdiction, type JurisdictionId } from "../real-estate-compliance";
import { COUNTRY_PACKS } from "./packs";
import {
  getSubdivisionOverlay,
  mergeLeaseRules,
  mergeTaxProfile,
} from "./subdivisions";
import type {
  CountryCode,
  CountryContext,
  CountryRulePack,
  ResolveCountryInput,
  TaxCalculationResult,
  TaxLineInput,
} from "./types";

export function getCountryPack(jurisdictionId: CountryCode): CountryRulePack {
  return COUNTRY_PACKS[jurisdictionId] || COUNTRY_PACKS.GLOBAL;
}

export function listCountryPacks(): CountryRulePack[] {
  return Object.values(COUNTRY_PACKS).filter((p) => p.jurisdictionId !== "GLOBAL");
}

export function resolveCountryContext(input: ResolveCountryInput = {}): CountryContext {
  const jurisdictionId: CountryCode =
    input.organizationJurisdiction ||
    resolveJurisdiction({
      country: input.country,
      region: input.subdivisionCode || input.region,
      city: input.city,
    });

  const pack = getCountryPack(jurisdictionId);
  const subdivision = input.subdivisionCode?.trim().toUpperCase();

  let effectiveTaxProfile = [...pack.taxProfile];
  let leaseRules = { ...pack.leaseRules };

  const subdivisionOverlay = getSubdivisionOverlay(jurisdictionId, subdivision);
  if (subdivisionOverlay) {
    leaseRules = mergeLeaseRules(leaseRules, subdivisionOverlay.leaseRules);
    effectiveTaxProfile = mergeTaxProfile(effectiveTaxProfile, subdivisionOverlay.taxProfile);
  }

  const currency = input.currency?.trim().toUpperCase() || pack.currency;

  return {
    jurisdictionId,
    subdivisionCode: subdivision,
    currency,
    timezone: pack.timezone,
    locale: pack.locale,
    pack: { ...pack, leaseRules },
    effectiveTaxProfile,
  };
}

export function getAvailablePaymentRails(context: CountryContext, purpose?: string) {
  const rails = context.pack.paymentRails.filter(
    (rail) => !purpose || rail.purposes.includes(purpose as typeof rail.purposes[number])
  );
  return [...rails].sort((a, b) => {
    if (a.id === "payangels") return -1;
    if (b.id === "payangels") return 1;
    return 0;
  });
}

export function calculateCountryTaxes(
  context: CountryContext,
  lines: TaxLineInput[]
): TaxCalculationResult {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const components: TaxCalculationResult["components"] = [];

  for (const line of lines) {
    for (const tax of context.effectiveTaxProfile) {
      if (!tax.appliesTo.includes(line.category)) continue;
      if (tax.rateBasisPoints <= 0) continue;
      const amountMinor = Math.round((line.amountMinor * tax.rateBasisPoints) / 10000);
      if (amountMinor <= 0) continue;
      components.push({
        id: tax.id,
        label: tax.label,
        amountMinor,
        rateBasisPoints: tax.rateBasisPoints,
      });
    }
  }

  const totalTaxMinor = components.reduce((sum, c) => sum + c.amountMinor, 0);

  return {
    jurisdictionId: context.jurisdictionId,
    currency: context.currency,
    subtotalMinor,
    components,
    totalTaxMinor,
    totalMinor: subtotalMinor + totalTaxMinor,
  };
}

export function validateAddressForCountry(
  context: CountryContext,
  input: Record<string, string>
): string | null {
  const { addressFormat } = context.pack;
  for (const field of addressFormat.requiredFields) {
    if (!input[field]?.trim()) {
      return `${field.replace(/_/g, " ")} is required for ${context.pack.label}`;
    }
  }
  return addressFormat.validate?.(input) ?? null;
}

export function getEnabledModulesForCountry(jurisdictionId: CountryCode): string[] {
  return getCountryPack(jurisdictionId).enabledModules;
}

export function jurisdictionSupportsModule(jurisdictionId: CountryCode, moduleSlug: string): boolean {
  return getEnabledModulesForCountry(jurisdictionId).includes(moduleSlug);
}

export type { CountryCode, CountryContext, CountryRulePack, JurisdictionId };
export {
  getSubdivisionOverlay,
  mergeLeaseRules,
  mergeTaxProfile,
  SUBDIVISION_OPTIONS,
  SUBDIVISION_ENABLED_JURISDICTIONS,
} from "./subdivisions";
export {
  resolveSubdivisionCode,
  subdivisionLabel,
} from "./subdivision-resolver";
export { payAngelsPrimaryRail, withPayAngelsPrimary, PAYANGELS_SUPPORTED_CURRENCIES } from "./payangels-rails";
