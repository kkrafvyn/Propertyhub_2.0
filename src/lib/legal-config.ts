/** Current policy bundle version — bump when material legal changes require re-acceptance. */
export const LEGAL_POLICY_VERSION = "2026-09-28-material-coverage";

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
    if (value) return value;
  }
  return "";
}

/** Registered operator shown in Legal Centre. Fill via VITE_LEGAL_* in production. */
export const LEGAL_OPERATOR = {
  name: envValue("VITE_LEGAL_COMPANY_NAME") || "BaytMiftah",
  legalEntityType: "Technology marketplace and property operating platform",
  jurisdiction: "Republic of Ghana",
  registrationNumber: envValue("VITE_LEGAL_REGISTRATION_NUMBER"),
  registeredAddress: envValue("VITE_LEGAL_REGISTERED_ADDRESS") || "Accra, Ghana",
  dataProtectionAuthority: "Data Protection Commission, Ghana",
  cyberAuthority: "Cyber Security Authority, Ghana",
} as const;

export const LEGAL_CONTACT = {
  legal: envValue("VITE_LEGAL_EMAIL") || "support@baytmiftah.com",
  privacy: envValue("VITE_PRIVACY_EMAIL") || "support@baytmiftah.com",
  support: envValue("VITE_SUPPORT_EMAIL") || "support@baytmiftah.com",
  dpo: envValue("VITE_DPO_EMAIL") || "support@baytmiftah.com",
  complaints: envValue("VITE_SUPPORT_EMAIL") || "support@baytmiftah.com",
  accessibility: envValue("VITE_SUPPORT_EMAIL") || "support@baytmiftah.com",
} as const;

export const LEGAL_PLATFORM_POSITION = {
  summary:
    "BaytMiftah provides technology, marketplace infrastructure, and workflow tooling. Customers, owners, agents, and service providers remain responsible for their own business operations, property information, listing accuracy, legal compliance, approvals, and transaction decisions unless a separate written agreement places a different responsibility on BaytMiftah.",
  doesNotAutomaticallyActAs:
    [
      "property owner",
      "landlord",
      "tenant",
      "seller",
      "buyer",
      "broker",
      "agent",
      "property manager",
      "contractor",
      "legal adviser",
      "financial adviser",
      "guarantor",
    ],
  managedServicesRequireSeparateAgreement: true,
  platformAndProviderResponsibilitiesMustBeSeparable: true,
} as const;

export const LEGAL_LAUNCH_CHECKLIST = [
  "confirm final legal entity identity and registration details",
  "review managed-services and property-management terms for client-specific responsibilities",
  "confirm PayAngels and payment-provider legal disclosures and refund allocation wording",
  "execute data-processing and DPA review for enterprise customer workflows",
  "confirm privacy, cookie, and complaints handling for production use",
  "review AI action approval and audit-log controls for material business decisions",
  "validate retention, offboarding, and deletion procedures for customer data",
  "verify tenant isolation and security controls before wider rollout",
] as const;

/** Repo evidence mapping for each launch checklist item (operator attestation in LEGAL_LAUNCH_SIGNOFF.md). */
export const LEGAL_LAUNCH_CHECKLIST_EVIDENCE: Record<
  (typeof LEGAL_LAUNCH_CHECKLIST)[number],
  string
> = {
  "confirm final legal entity identity and registration details":
    "LEGAL_OPERATOR + VITE_LEGAL_* in .env; docs/legal/LEGAL_LAUNCH_SIGNOFF.md",
  "review managed-services and property-management terms for client-specific responsibilities":
    "policies: business-saas-terms, property-owner-terms, agency-agent-terms",
  "confirm PayAngels and payment-provider legal disclosures and refund allocation wording":
    "policies: payments, refunds; checkout LegalAcceptanceCheckbox + PAYMENT disclaimers",
  "execute data-processing and DPA review for enterprise customer workflows":
    "policies: data-processing; ACCEPTANCE_SCOPES.agency_onboarding / business_workspace",
  "confirm privacy, cookie, and complaints handling for production use":
    "CookieConsentBanner, ComplaintForm, policies: privacy, cookies, complaints",
  "review AI action approval and audit-log controls for material business decisions":
    "AI Command Center approvals, platform feature flags, agentic fail-closed prod paths",
  "validate retention, offboarding, and deletion procedures for customer data":
    "scripts/workers/apply-data-retention.mjs; policy: data-retention, privacy-rights",
  "verify tenant isolation and security controls before wider rollout":
    "tests/tenant-isolation.test.ts; RLS audit; scripts/security/",
};

/** Client-visible mirror of operator sign-off (set VITE_LEGAL_LAUNCH_SIGNED_OFF in env). */
export function isLegalLaunchSignedOff(): boolean {
  const flag = envValue("VITE_LEGAL_LAUNCH_SIGNED_OFF");
  return flag.toLowerCase() === "true" || flag === "1";
}

export type LegalAcceptanceScope =
  | "signup_consumer"
  | "signup_host"
  | "payment_checkout"
  | "short_stay_booking"
  | "listing_publish"
  | "agency_onboarding"
  | "personal_host_onboarding"
  | "kyc_submission"
  | "account_signup"
  | "marketplace_use"
  | "lease_application"
  | "lease_signature"
  | "tenant_screening"
  | "marketing"
  | "smart_access"
  | "developer_api"
  | "business_workspace"
  | "vendor_onboarding"
  | "owner_onboarding";

export const ACCEPTANCE_SCOPES: Record<
  LegalAcceptanceScope,
  { policySlugs: string[]; labelKey: string }
> = {
  signup_consumer: {
    policySlugs: ["terms", "privacy", "marketplace-rules", "cookies"],
    labelKey: "legal.acceptance.signupConsumer",
  },
  signup_host: {
    policySlugs: ["terms", "privacy", "marketplace-rules", "host-terms", "payments", "cookies"],
    labelKey: "legal.acceptance.signupHost",
  },
  payment_checkout: {
    policySlugs: ["payments", "refunds"],
    labelKey: "legal.acceptance.paymentCheckout",
  },
  short_stay_booking: {
    policySlugs: ["tenant-guest-rules", "payments", "refunds"],
    labelKey: "legal.acceptance.shortStayBooking",
  },
  listing_publish: {
    policySlugs: ["property-owner-terms", "marketplace-rules", "non-discrimination"],
    labelKey: "legal.acceptance.listingPublish",
  },
  agency_onboarding: {
    policySlugs: ["agency-agent-terms", "data-processing", "trust-verification"],
    labelKey: "legal.acceptance.agencyOnboarding",
  },
  personal_host_onboarding: {
    policySlugs: ["property-owner-terms", "kyc", "privacy", "data-processing"],
    labelKey: "legal.acceptance.personalHostOnboarding",
  },
  kyc_submission: {
    policySlugs: ["kyc", "privacy"],
    labelKey: "legal.acceptance.kycSubmission",
  },
  account_signup: {
    policySlugs: ["terms", "privacy", "cookies", "age-minor-protection"],
    labelKey: "legal.acceptance.accountSignup",
  },
  marketplace_use: {
    policySlugs: ["terms", "marketplace-rules", "privacy-rights"],
    labelKey: "legal.acceptance.marketplaceUse",
  },
  lease_application: {
    policySlugs: ["terms", "tenant-guest-rules", "tenant-screening"],
    labelKey: "legal.acceptance.leaseApplication",
  },
  lease_signature: {
    policySlugs: ["e-signatures", "terms", "privacy"],
    labelKey: "legal.acceptance.leaseSignature",
  },
  tenant_screening: {
    policySlugs: ["tenant-screening", "privacy-rights", "terms"],
    labelKey: "legal.acceptance.tenantScreening",
  },
  marketing: {
    policySlugs: ["communications-marketing", "privacy-rights", "cookies"],
    labelKey: "legal.acceptance.marketing",
  },
  smart_access: {
    policySlugs: ["smart-access-security", "privacy", "location-data"],
    labelKey: "legal.acceptance.smartAccess",
  },
  developer_api: {
    policySlugs: ["developer-api-terms", "privacy", "terms"],
    labelKey: "legal.acceptance.developerApi",
  },
  business_workspace: {
    policySlugs: ["business-saas-terms", "data-processing", "privacy-rights"],
    labelKey: "legal.acceptance.businessWorkspace",
  },
  vendor_onboarding: {
    policySlugs: ["vendor-terms", "professional-credentials", "privacy"],
    labelKey: "legal.acceptance.vendorOnboarding",
  },
  owner_onboarding: {
    policySlugs: ["property-owner-terms", "professional-credentials", "terms"],
    labelKey: "legal.acceptance.ownerOnboarding",
  },
};

export type CookieCategory = "essential" | "functional" | "analytics" | "marketing";

export type CookieDefinition = {
  name: string;
  category: CookieCategory;
  purpose: string;
  duration: string;
  provider: string;
};

export const COOKIE_DEFINITIONS: CookieDefinition[] = [
  {
    name: "sb-*-auth-token",
    category: "essential",
    purpose: "Supabase authentication session",
    duration: "Session / refresh rotation",
    provider: "BaytMiftah (Supabase)",
  },
  {
    name: "bm_cookie_consent",
    category: "essential",
    purpose: "Stores your cookie preference choices",
    duration: "12 months",
    provider: "BaytMiftah",
  },
  {
    name: "bm_legal_version",
    category: "essential",
    purpose: "Tracks accepted policy version for re-prompting",
    duration: "12 months",
    provider: "BaytMiftah",
  },
  {
    name: "bm_locale",
    category: "functional",
    purpose: "Language and locale preference",
    duration: "12 months",
    provider: "BaytMiftah",
  },
  {
    name: "bm_market",
    category: "functional",
    purpose: "Market jurisdiction and city defaults",
    duration: "12 months",
    provider: "BaytMiftah",
  },
  {
    name: "bm_theme",
    category: "functional",
    purpose: "Light/dark theme preference",
    duration: "12 months",
    provider: "BaytMiftah",
  },
  {
    name: "_ga / _gid",
    category: "analytics",
    purpose: "Aggregated usage analytics (only if enabled)",
    duration: "Up to 24 months",
    provider: "Google Analytics (if enabled)",
  },
];

export const COOKIE_CONSENT_KEY = "bm_cookie_consent";
export const LEGAL_VERSION_KEY = "bm_legal_version";

export type CookieConsent = {
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsent = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
  updatedAt: new Date().toISOString(),
};
