import type { CountryRulePack } from "../types";
import { withPayAngelsPrimary } from "../payangels-rails";

const baseLease = (refs: string[], clauses: string[]): CountryRulePack["leaseRules"] => ({
  statutoryReferences: refs,
  requiredLeaseClauses: clauses,
});

export const GH_PACK: CountryRulePack = {
  jurisdictionId: "GH",
  label: "Ghana",
  currency: "GHS",
  timezone: "Africa/Accra",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 1500, appliesTo: ["service_fee", "short_stay"], authority: "GRA" },
    { id: "nhil", label: "NHIL", rateBasisPoints: 250, appliesTo: ["service_fee"], authority: "GRA" },
    { id: "getfund", label: "GETFund Levy", rateBasisPoints: 250, appliesTo: ["service_fee"], authority: "GRA" },
    { id: "withholding_rent", label: "Rent withholding", rateBasisPoints: 800, appliesTo: ["rent"], authority: "GRA", notes: "8% on rent paid to non-resident landlords" },
    { id: "stamp_duty", label: "Stamp duty", rateBasisPoints: 50, appliesTo: ["sale"], authority: "GRA" },
  ],
  paymentRails: withPayAngelsPrimary("GHS", [
    { id: "momo_mtn", label: "MTN MoMo", currencies: ["GHS"], purposes: ["rent", "disbursement"], integrationSlug: "momo-mtn", envRequired: ["MTN_MOMO_SUBSCRIPTION_KEY"] },
    { id: "bank_transfer", label: "Bank / GhIPSS", currencies: ["GHS"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: {
    ...baseLease(
      ["Rent Control Act, 1963 (Act 220)", "Rent Act, 1963"],
      ["Security deposit terms", "Advance rent cap where rent control applies", "Repair obligations", "Notice to quit"]
    ),
    maxAdvanceRentMonths: 6,
    maxSecurityDepositMonths: 3,
    minNoticeDaysTenant: 30,
    minNoticeDaysLandlord: 90,
    rentControlApplies: true,
  },
  screening: { checkTypes: ["identity", "income"], providerSlug: "ghana-trust", requiredFor: ["residential", "commercial"] },
  addressFormat: {
    requiredFields: ["address", "city", "region"],
    optionalFields: ["ghana_post_gps"],
    nationalIdLabel: "Ghana Card",
    validate: (input) => {
      const gps = input.ghana_post_gps?.trim().toUpperCase();
      if (gps && !/^[A-Z]{2}-\d{3,4}-\d{3,4}$/.test(gps)) return "GhanaPostGPS format: XX-000-0000";
      return null;
    },
  },
  enabledModules: ["ghana-trust", "gate-kiosk", "sub-metering", "momo", "act-220-analyzer"],
  expansionNotes: ["Primary market — full module set enabled"],
};

export const NG_PACK: CountryRulePack = {
  jurisdictionId: "NG",
  label: "Nigeria",
  currency: "NGN",
  timezone: "Africa/Lagos",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 750, appliesTo: ["service_fee", "rent", "short_stay"], authority: "FIRS" },
    { id: "withholding_rent", label: "WHT on rent", rateBasisPoints: 1000, appliesTo: ["rent"], authority: "FIRS" },
    { id: "stamp_duty", label: "Stamp duty", rateBasisPoints: 80, appliesTo: ["sale", "lease"], authority: "State" },
  ],
  paymentRails: withPayAngelsPrimary("NGN", [
    { id: "bank_transfer", label: "Bank transfer", currencies: ["NGN"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: {
    ...baseLease(
      ["Lagos Tenancy Law 2011", "Tenancy laws vary by state"],
      ["Governor's consent disclosure where applicable", "Advance rent limits for Lagos tenants", "Notice periods per state law"]
    ),
    maxAdvanceRentMonths: 12,
    maxSecurityDepositMonths: 1,
    minNoticeDaysTenant: 7,
    minNoticeDaysLandlord: 30,
  },
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "region"], optionalFields: ["lga"], postalCodeLabel: "Postal code" },
  enabledModules: ["collections", "lease-applications", "multi-currency-fx"],
  expansionNotes: ["State overlays: Lagos, FCT Abuja, Rivers, Ogun, Kano — configure in International Markets"],
};

export const KE_PACK: CountryRulePack = {
  jurisdictionId: "KE",
  label: "Kenya",
  currency: "KES",
  timezone: "Africa/Nairobi",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 1600, appliesTo: ["service_fee", "short_stay"], authority: "KRA" },
    { id: "withholding_rent", label: "Residential rent WHT", rateBasisPoints: 750, appliesTo: ["rent"], authority: "KRA" },
  ],
  paymentRails: withPayAngelsPrimary("KES", [
    { id: "mpesa", label: "M-Pesa", currencies: ["KES"], purposes: ["rent", "disbursement"], integrationSlug: "momo-mtn" },
    { id: "bank_transfer", label: "Bank transfer", currencies: ["KES"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Landlord and Tenant (Shops, Hotels and Catering Establishments) Act", "Distress for Rent Act"],
    ["Rent deposit terms", "Statutory notice periods", "Land Control Board consent for agricultural land"]
  ),
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "county"], optionalFields: ["postal_code"] },
  enabledModules: ["lease-applications", "maintenance", "collections"],
  expansionNotes: ["M-Pesa integration via partner credentials"],
};

export const ZA_PACK: CountryRulePack = {
  jurisdictionId: "ZA",
  label: "South Africa",
  currency: "ZAR",
  timezone: "Africa/Johannesburg",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 1500, appliesTo: ["service_fee", "short_stay"], authority: "SARS" },
    { id: "withholding_rent", label: "Non-resident WHT", rateBasisPoints: 750, appliesTo: ["rent"], authority: "SARS" },
  ],
  paymentRails: withPayAngelsPrimary("ZAR", [
    { id: "bank_transfer", label: "EFT", currencies: ["ZAR"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Rental Housing Act 1999", "Consumer Protection Act 2008"],
    ["Deposit in interest-bearing account", "Inspection-in/out report", "20 business days deposit return"]
  ),
  screening: { checkTypes: ["identity", "income", "credit"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "province"], optionalFields: ["postal_code"], postalCodeLabel: "Postal code" },
  enabledModules: ["lease-applications", "inspections", "collections"],
  expansionNotes: ["POPIA data protection compliance required"],
};

export const US_PACK: CountryRulePack = {
  jurisdictionId: "US",
  label: "United States",
  currency: "USD",
  timezone: "America/New_York",
  locale: "en",
  taxProfile: [
    { id: "state_sales_tax", label: "State/local tax (varies)", rateBasisPoints: 0, appliesTo: ["service_fee", "short_stay"], notes: "Configure per state overlay" },
    { id: "withholding_contractor", label: "1099-NEC reporting", rateBasisPoints: 0, appliesTo: ["contractor"], authority: "IRS", notes: "Report if ≥ $600 paid to contractor" },
  ],
  paymentRails: withPayAngelsPrimary("USD", [
    { id: "bank_transfer", label: "Wire / ACH fallback", currencies: ["USD"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Fair Housing Act", "RESPA (disclosures)", "State landlord-tenant statutes"],
    ["Lead-based paint disclosure (pre-1978)", "Security deposit handling per state", "Habitability warranty"]
  ),
  screening: { checkTypes: ["credit", "criminal", "eviction"], providerSlug: "transunion-smartmove", requiredFor: ["residential", "commercial"] },
  addressFormat: { requiredFields: ["address", "city", "state", "zip"], optionalFields: ["unit"], postalCodeLabel: "ZIP code" },
  enabledModules: ["1099-reporting", "trust-accounting", "hoa", "cam-billing", "tenant-screening", "commercial-escalations"],
  expansionNotes: ["PayAngels worldwide · 16 US state overlays for deposit caps, rent control, and sales tax"],
};

export const GB_PACK: CountryRulePack = {
  jurisdictionId: "GB",
  label: "United Kingdom",
  currency: "GBP",
  timezone: "Europe/London",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 2000, appliesTo: ["service_fee", "short_stay"], authority: "HMRC", notes: "Residential rent generally exempt; fees may be taxable" },
    { id: "stamp_duty", label: "SDLT (buyer)", rateBasisPoints: 0, appliesTo: ["sale"], authority: "HMRC" },
  ],
  paymentRails: withPayAngelsPrimary("GBP", [
    { id: "bank_transfer", label: "BACS / Faster Payments", currencies: ["GBP"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Housing Act 1988 (AST)", "Tenant Fees Act 2019", "Homes (Fitness for Human Habitation) Act 2018"],
    ["Deposit protection scheme within 30 days", "How to Rent guide", "Gas safety certificate"]
  ),
  screening: { checkTypes: ["identity", "income", "credit"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "postcode"], optionalFields: [], postalCodeLabel: "Postcode" },
  enabledModules: ["lease-applications", "deposit-protection", "right-to-rent"],
  expansionNotes: ["Right to Rent checks required for England"],
};

export const EU_PACK: CountryRulePack = {
  jurisdictionId: "EU",
  label: "European Union",
  currency: "EUR",
  timezone: "Europe/Berlin",
  locale: "en",
  taxProfile: [
    { id: "vat", label: "VAT (member state)", rateBasisPoints: 2000, appliesTo: ["service_fee", "short_stay"], authority: "National tax authority", notes: "MOSS/OSS for cross-border digital services" },
  ],
  paymentRails: withPayAngelsPrimary("EUR", [
    { id: "bank_transfer", label: "SEPA transfer", currencies: ["EUR"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["GDPR", "Consumer Rights Directive", "National tenancy laws apply"],
    ["GDPR lawful basis for tenant data", "Deposit rules per member state", "Energy performance certificate"]
  ),
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "postal_code", "country"], optionalFields: [], postalCodeLabel: "Postal code" },
  enabledModules: ["gdpr-retention", "multi-currency-fx"],
  expansionNotes: ["EU member overlays: DE, FR, IE, NL, ES, IT, PT, BE — VAT and tenancy localized"],
};

export const AE_PACK: CountryRulePack = {
  jurisdictionId: "AE",
  label: "United Arab Emirates",
  currency: "AED",
  timezone: "Asia/Dubai",
  locale: "ar",
  taxProfile: [
    { id: "vat", label: "VAT", rateBasisPoints: 500, appliesTo: ["service_fee", "short_stay"], authority: "FTA" },
    { id: "tourism_levy", label: "Tourism dirham", rateBasisPoints: 0, appliesTo: ["short_stay"], notes: "Municipal fees vary by emirate" },
  ],
  paymentRails: withPayAngelsPrimary("AED", [
    { id: "bank_transfer", label: "Bank transfer", currencies: ["AED"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Dubai Law No. 26 of 2007 (Ejari)", "RERA regulations", "Abu Dhabi tenancy laws"],
    ["Ejari registration", "Security deposit cap (5% residential Dubai)", "90-day notice for non-renewal"]
  ),
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "emirate"], optionalFields: ["makani"] },
  enabledModules: ["ejari-tracking", "short-stay"],
  expansionNotes: ["Emirate overlays: Dubai (Ejari), Abu Dhabi (Tawtheeq), Sharjah, Ajman"],
};

export const CA_PACK: CountryRulePack = {
  jurisdictionId: "CA",
  label: "Canada",
  currency: "CAD",
  timezone: "America/Toronto",
  locale: "en",
  taxProfile: [
    { id: "gst", label: "GST/HST", rateBasisPoints: 500, appliesTo: ["service_fee", "short_stay"], authority: "CRA", notes: "HST varies by province (5–15%)" },
  ],
  paymentRails: withPayAngelsPrimary("CAD", [
    { id: "bank_transfer", label: "Interac e-Transfer", currencies: ["CAD"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Provincial residential tenancy acts", "PIPEDA"],
    ["Provincial standard lease form where mandated", "Deposit rules vary by province", "Rent increase guidelines"]
  ),
  screening: { checkTypes: ["credit", "identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "province", "postal_code"], optionalFields: [], postalCodeLabel: "Postal code" },
  enabledModules: ["provincial-tenancy", "pipeda-retention"],
  expansionNotes: ["Ontario, BC, Quebec, Alberta, Manitoba, Saskatchewan provincial overlays available"],
};

export const AU_PACK: CountryRulePack = {
  jurisdictionId: "AU",
  label: "Australia",
  currency: "AUD",
  timezone: "Australia/Sydney",
  locale: "en",
  taxProfile: [
    { id: "gst", label: "GST", rateBasisPoints: 1000, appliesTo: ["service_fee", "short_stay"], authority: "ATO", notes: "Residential rent generally GST-free" },
  ],
  paymentRails: withPayAngelsPrimary("AUD", [
    { id: "bank_transfer", label: "BPAY / EFT", currencies: ["AUD"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Residential Tenancies Act (state/territory)", "Privacy Act 1988"],
    ["Bond lodgement with state authority", "Condition report", "Minimum notice periods per state"]
  ),
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "suburb", "state", "postcode"], optionalFields: [], postalCodeLabel: "Postcode" },
  enabledModules: ["bond-lodgement", "state-tenancy"],
  expansionNotes: ["NSW, VIC, QLD, WA, SA state bond and tenancy overlays"],
};

export const IN_PACK: CountryRulePack = {
  jurisdictionId: "IN",
  label: "India",
  currency: "INR",
  timezone: "Asia/Kolkata",
  locale: "hi",
  taxProfile: [
    { id: "gst", label: "GST", rateBasisPoints: 1800, appliesTo: ["service_fee", "short_stay"], authority: "CBIC", notes: "Commercial rent may attract GST; residential generally exempt" },
    { id: "withholding_rent", label: "TDS on rent", rateBasisPoints: 1000, appliesTo: ["rent"], authority: "CBDT", notes: "TDS u/s 194-I when rent exceeds threshold" },
  ],
  paymentRails: withPayAngelsPrimary("INR", [
    { id: "bank_transfer", label: "NEFT / RTGS / UPI", currencies: ["INR"], purposes: ["rent", "disbursement"] },
  ]),
  leaseRules: baseLease(
    ["Model Tenancy Act 2021 (state adoption varies)", "Registration Act 1908"],
    ["Stamp duty on lease deed", "Security deposit cap where state law applies", "Rent escalation clauses"]
  ),
  screening: { checkTypes: ["identity", "income"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "state", "pincode"], optionalFields: [], postalCodeLabel: "PIN code" },
  enabledModules: ["lease-registration", "tds-rent"],
  expansionNotes: ["State overlays: Maharashtra, Delhi, Karnataka, Tamil Nadu, Telangana"],
};

export const GLOBAL_PACK: CountryRulePack = {
  jurisdictionId: "GLOBAL",
  label: "International (default)",
  currency: "USD",
  timezone: "UTC",
  locale: "en",
  taxProfile: [],
  paymentRails: withPayAngelsPrimary("USD"),
  leaseRules: baseLease(
    ["Local law applies", "Consult qualified counsel before publishing"],
    ["Governing law clause", "Dispute resolution", "Force majeure"]
  ),
  screening: { checkTypes: ["identity"], requiredFor: ["residential"] },
  addressFormat: { requiredFields: ["address", "city", "country"], optionalFields: ["region", "postal_code"] },
  enabledModules: ["compliance-center", "esignature"],
  expansionNotes: ["PayAngels worldwide checkout — select a market pack for full regulatory coverage"],
};

export const COUNTRY_PACKS: Record<string, CountryRulePack> = {
  GH: GH_PACK,
  NG: NG_PACK,
  KE: KE_PACK,
  ZA: ZA_PACK,
  US: US_PACK,
  GB: GB_PACK,
  EU: EU_PACK,
  AE: AE_PACK,
  CA: CA_PACK,
  AU: AU_PACK,
  IN: IN_PACK,
  GLOBAL: GLOBAL_PACK,
};
