export const LEGAL_EFFECTIVE_DATE = "14 August 2026";
export const LEGAL_LAST_UPDATED = "14 August 2026";

export const PLATFORM_ROLE_STATEMENT =
  "BaytMiftah is a technology marketplace and property operating platform. It does not hold, custody, safeguard, or control customer funds and does not provide escrow or payment-custody services.";

export type LegalCategoryId =
  | "general"
  | "payments"
  | "participants"
  | "trust"
  | "ip-data"
  | "business"
  | "support"
  | "company";

export type LegalSection = {
  heading: string;
  content?: string;
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  category: LegalCategoryId;
  description: string;
  seoTitle: string;
  seoDescription: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
  relatedPolicies?: string[];
  showCookieControls?: boolean;
  showComplaintForm?: boolean;
};

export type LegalCategory = {
  id: Exclude<LegalCategoryId, "support" | "company">;
  label: string;
  slugs: string[];
};

export const LEGAL_CATEGORIES: LegalCategory[] = [
  {
    id: "general",
    label: "General",
    slugs: ["terms", "privacy", "cookies", "marketplace-rules"],
  },
  {
    id: "payments",
    label: "Payments & Transactions",
    slugs: ["payments", "refunds", "fees", "e-signatures"],
  },
  {
    id: "participants",
    label: "Property & Marketplace Participants",
    slugs: [
      "host-terms",
      "property-owner-terms",
      "agency-agent-terms",
      "tenant-guest-rules",
      "vendor-terms",
    ],
  },
  {
    id: "trust",
    label: "Trust & Safety",
    slugs: [
      "acceptable-use",
      "trust-verification",
      "kyc",
      "aml-sanctions",
      "disputes",
      "safety",
      "non-discrimination",
      "liability",
      "complaints",
    ],
  },
  {
    id: "ip-data",
    label: "Intellectual Property & Data",
    slugs: ["copyright", "data-processing", "accessibility"],
  },
  {
    id: "business",
    label: "Business",
    slugs: ["whitelabel"],
  },
];

export const FOOTER_LEGAL_LINKS = [
  { slug: "terms", label: "Terms" },
  { slug: "privacy", label: "Privacy" },
  { slug: "cookies", label: "Cookies" },
  { slug: "payments", label: "Payments" },
  { slug: "marketplace-rules", label: "Marketplace Rules" },
  { slug: "refunds", label: "Refunds" },
  { slug: "fees", label: "Fees" },
  { slug: "trust-verification", label: "Trust & Verification" },
  { slug: "complaints", label: "Complaints" },
] as const;

/** Legacy slugs continue to resolve to the canonical Legal Centre routes. */
export const LEGAL_SLUG_ALIASES: Record<string, string> = {
  "payment-escrow": "payments",
  "payments-transaction": "payments",
  "refund-cancellation": "refunds",
  "service-fees": "fees",
  "e-signature": "e-signatures",
  "owner-terms": "property-owner-terms",
  "agency-terms": "agency-agent-terms",
  "vendor-contractor": "vendor-terms",
  "kyc-identity": "kyc",
  "dispute-resolution": "disputes",
  "insurance-liability": "liability",
  "whitelabel-partner": "whitelabel",
  "fair-housing": "non-discrimination",
};

export function sectionAnchor(heading: string) {
  return heading
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
