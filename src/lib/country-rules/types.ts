import type { JurisdictionId, ListingType } from "../real-estate-compliance";

export type CountryCode = JurisdictionId;

export type PaymentRailId =
  | "payangels"
  | "momo_mtn"
  | "momo_telecel"
  | "mpesa"
  | "stripe_card"
  | "stripe_ach"
  | "open_banking"
  | "bank_transfer"
  | "wallet";

export type TaxComponentId =
  | "vat"
  | "gst"
  | "nhil"
  | "getfund"
  | "withholding_rent"
  | "withholding_contractor"
  | "stamp_duty"
  | "tourism_levy"
  | "state_sales_tax";

export interface TaxComponent {
  id: TaxComponentId;
  label: string;
  rateBasisPoints: number;
  appliesTo: ("rent" | "sale" | "lease" | "service_fee" | "short_stay" | "contractor")[];
  authority?: string;
  notes?: string;
}

export interface PaymentRail {
  id: PaymentRailId;
  label: string;
  currencies: string[];
  purposes: ("rent" | "deposit" | "purchase" | "short_stay" | "disbursement")[];
  integrationSlug?: string;
  envRequired?: string[];
}

export interface LeaseRuleSet {
  maxAdvanceRentMonths?: number;
  maxSecurityDepositMonths?: number;
  minNoticeDaysTenant?: number;
  minNoticeDaysLandlord?: number;
  rentControlApplies?: boolean;
  statutoryReferences: string[];
  requiredLeaseClauses: string[];
}

export interface ScreeningRequirement {
  checkTypes: ("credit" | "criminal" | "eviction" | "identity" | "income")[];
  providerSlug?: string;
  requiredFor: ("residential" | "commercial")[];
}

export interface AddressFormat {
  requiredFields: string[];
  optionalFields: string[];
  postalCodeLabel?: string;
  nationalIdLabel?: string;
  validate?: (input: Record<string, string>) => string | null;
}

export interface CountryRulePack {
  jurisdictionId: CountryCode;
  label: string;
  currency: string;
  timezone: string;
  locale: string;
  taxProfile: TaxComponent[];
  paymentRails: PaymentRail[];
  leaseRules: LeaseRuleSet;
  screening: ScreeningRequirement;
  addressFormat: AddressFormat;
  enabledModules: string[];
  expansionNotes: string[];
}

export interface CountryContext {
  jurisdictionId: CountryCode;
  subdivisionCode?: string;
  currency: string;
  timezone: string;
  locale: string;
  pack: CountryRulePack;
  effectiveTaxProfile: TaxComponent[];
}

export interface TaxLineInput {
  category: TaxComponent["appliesTo"][number];
  amountMinor: number;
}

export interface TaxCalculationResult {
  jurisdictionId: CountryCode;
  currency: string;
  subtotalMinor: number;
  components: Array<{ id: TaxComponentId; label: string; amountMinor: number; rateBasisPoints: number }>;
  totalTaxMinor: number;
  totalMinor: number;
}

export interface ResolveCountryInput {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  subdivisionCode?: string | null;
  currency?: string | null;
  organizationJurisdiction?: CountryCode | null;
}

export type ListingComplianceResult = {
  jurisdictionId: CountryCode;
  pack: CountryRulePack;
  checklist: string[];
  paymentDisclosures: string[];
  governingLaw: string;
  listingType: ListingType;
};
