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
      "Identity documents were reviewed at a point in time. Verification is a platform feature and does not guarantee future conduct or financial standing.",
  },
  payment_hold: {
    short: "Third-party payment",
    disclaimer:
      "Payments are processed by the applicable third-party payment provider, bank, or financial institution. BaytMiftah does not hold, custody, or control customer funds and does not operate an escrow service.",
  },
  licensed_payment_partner: {
    short: "Licensed payment partner",
    disclaimer:
      "Card and mobile money payments are processed by licensed third-party providers. BaytMiftah does not store full card numbers and does not take possession of the funds.",
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
  "BaytMiftah is a technology marketplace and property operating platform. It does not hold, custody, safeguard, or control customer funds and does not provide escrow or payment-custody services. Unless expressly stated otherwise in a separate agreement, BaytMiftah is not a party to the underlying agreement between users.";

export const CHECKOUT_PAYMENT_DISCLAIMER =
  "Supported payments are processed by the applicable third-party payment provider. BaytMiftah may initiate payment requests, display instructions, generate payment links, and update transaction status from provider notifications. A payment shown as completed means BaytMiftah received confirmation from the payment provider. BaytMiftah does not hold, custody, or control customer funds.";

export const AI_ASSISTANT_DISCLAIMER =
  "AI responses are informational only and are not legal, financial, or investment advice. Verify important details independently.";

export const TRUST_VERIFICATION_POLICY_PATH = "/legal/trust-verification";
export const PAYMENTS_POLICY_PATH = "/legal/payments";
