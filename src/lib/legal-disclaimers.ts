/**
 * User-facing trust labels and limitation copy.
 * Keep marketing language aligned with legal/trust-verification policy.
 */

export type TrustLabelKey =
  | "platform_reviewed_agency"
  | "platform_reviewed_listing"
  | "id_checked"
  | "payment_hold"
  | "licensed_payment_partner"
  | "listing_quality_score"
  | "not_legal_advice";

export const TRUST_LABELS: Record<
  TrustLabelKey,
  { short: string; disclaimer: string }
> = {
  platform_reviewed_agency: {
    short: "Platform reviewed",
    disclaimer:
      "BaytMiftah reviewed submitted agency/workspace information. This is not a government licence endorsement, title guarantee, or property inspection.",
  },
  platform_reviewed_listing: {
    short: "Listing reviewed",
    disclaimer:
      "This listing passed platform quality checks at submission. BaytMiftah does not guarantee accuracy, ownership, condition, or legal title.",
  },
  id_checked: {
    short: "ID checked",
    disclaimer:
      "Identity documents were reviewed at a point in time. KYC does not guarantee future conduct or financial standing.",
  },
  payment_hold: {
    short: "Payment hold",
    disclaimer:
      "Funds may be held until agreed milestones. BaytMiftah is not a bank or licensed escrow agent; payments are processed by third-party providers.",
  },
  licensed_payment_partner: {
    short: "Licensed payment partner",
    disclaimer:
      "Card and mobile money payments are processed by licensed third-party providers (e.g. Paystack). BaytMiftah does not store full card numbers.",
  },
  listing_quality_score: {
    short: "Listing quality score",
    disclaimer:
      "An internal completeness score only. It is not a safety, legal, or valuation certification.",
  },
  not_legal_advice: {
    short: "Information only",
    disclaimer:
      "BaytMiftah provides technology and marketplace tools only. This is not legal, financial, tax, or investment advice.",
  },
};

export const MARKETPLACE_FOOTER_DISCLAIMER =
  "BaytMiftah is a technology marketplace connecting users. We are not a party to property contracts, not a bank, and not a licensed estate agent unless explicitly stated in writing.";

export const CHECKOUT_PAYMENT_DISCLAIMER =
  "Payments are processed by licensed third-party providers. Payment holds follow our Payment & Escrow Terms. BaytMiftah is not a bank or escrow agent.";

export const AI_ASSISTANT_DISCLAIMER =
  "AI responses are informational only and are not legal, financial, or investment advice. Verify important details independently.";

export const TRUST_VERIFICATION_POLICY_PATH = "/legal/trust-verification";
