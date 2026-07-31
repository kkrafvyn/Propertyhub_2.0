/** Current policy bundle version — bump when material legal changes require re-acceptance. */
export const LEGAL_POLICY_VERSION = "2026-07-30";

export const LEGAL_CONTACT = {
  legal: "legal@baytmiftah.com",
  privacy: "privacy@baytmiftah.com",
  support: "support@baytmiftah.com",
  dpo: "privacy@baytmiftah.com",
} as const;

export type LegalAcceptanceScope =
  | "signup_consumer"
  | "signup_host"
  | "escrow_checkout"
  | "short_stay_booking"
  | "listing_publish"
  | "agency_onboarding"
  | "kyc_submission";

export const ACCEPTANCE_SCOPES: Record<
  LegalAcceptanceScope,
  { policySlugs: string[]; labelKey: string }
> = {
  signup_consumer: {
    policySlugs: ["terms", "privacy", "marketplace-rules", "cookies"],
    labelKey: "legal.acceptance.signupConsumer",
  },
  signup_host: {
    policySlugs: ["terms", "privacy", "marketplace-rules", "host-terms", "payment-escrow", "cookies"],
    labelKey: "legal.acceptance.signupHost",
  },
  escrow_checkout: {
    policySlugs: ["payment-escrow", "refund-cancellation"],
    labelKey: "legal.acceptance.escrowCheckout",
  },
  short_stay_booking: {
    policySlugs: ["tenant-guest-rules", "payment-escrow", "refund-cancellation"],
    labelKey: "legal.acceptance.shortStayBooking",
  },
  listing_publish: {
    policySlugs: ["owner-terms", "marketplace-rules", "fair-housing"],
    labelKey: "legal.acceptance.listingPublish",
  },
  agency_onboarding: {
    policySlugs: ["agency-terms", "data-processing", "trust-verification"],
    labelKey: "legal.acceptance.agencyOnboarding",
  },
  kyc_submission: {
    policySlugs: ["kyc-identity", "privacy"],
    labelKey: "legal.acceptance.kycSubmission",
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
