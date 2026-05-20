import { mobileCalendarService } from "./mobile-calendar.service";

export type ReferralRewardStatus =
  | "pending_review"
  | "approved"
  | "paid"
  | "rejected"
  | "fraud_hold";

export function buildDocumentTemplateDrafts(input: {
  organizationName?: string | null;
  propertyAddress?: string | null;
  listingType?: string | null;
  price?: number | null;
  currency?: string | null;
}) {
  const orgName = input.organizationName || "BaytMiftah agency";
  const address = input.propertyAddress || "the property";
  const price = input.price
    ? `${input.currency || "GHS"} ${Number(input.price).toLocaleString()}`
    : "the agreed amount";
  const isSale = input.listingType === "sale";

  return [
    {
      key: "viewing_checklist",
      title: "Viewing checklist",
      legalGate: false,
      body: [
        `Viewing checklist for ${address}`,
        "Confirm arrival time, contact person, access instructions, visible defects, water pressure, power backup, drainage, parking, and neighborhood access.",
        "Capture photos only with consent and store notes inside the BaytMiftah deal room.",
      ].join("\n\n"),
    },
    {
      key: isSale ? "offer_letter" : "tenancy_draft",
      title: isSale ? "Offer letter draft" : "Tenancy agreement draft",
      legalGate: true,
      body: [
        `${isSale ? "Offer" : "Tenancy"} draft for ${address}`,
        `${orgName} records ${price} as the current commercial reference. Final terms require owner/landlord confirmation and legal review.`,
        "This draft is operational guidance only. Do not treat it as executed until approved by the parties and legal/compliance reviewers.",
      ].join("\n\n"),
    },
    {
      key: "payment_receipt",
      title: "Payment receipt note",
      legalGate: false,
      body: [
        `Receipt note for ${address}`,
        "Record payment provider, reference, amount, payer, payee, purpose, timestamp, and internal integrity hash.",
        "Funds should only move through approved BaytMiftah payment rails and the provider-neutral PaymentService.",
      ].join("\n\n"),
    },
  ];
}

export function buildViewingCalendarExports(input: {
  title: string;
  startsAt?: string | null;
  location?: string | null;
  description?: string | null;
}) {
  return {
    ics: mobileCalendarService.buildIcs({
      title: input.title,
      startsAt: input.startsAt,
      location: input.location,
      description: input.description,
      durationMinutes: 45,
    }),
    googleUrl: mobileCalendarService.getGoogleCalendarUrl({
      title: input.title,
      startsAt: input.startsAt,
      location: input.location,
      description: input.description,
      durationMinutes: 45,
    }),
    providerReadiness: [
      "Google Calendar OAuth remains readiness-gated until consent review.",
      "Outlook Calendar OAuth remains readiness-gated until consent review.",
      "ICS export is safe as a provider-neutral fallback.",
    ],
  };
}

export function buildTrustExplanationSignals(input: {
  organizationVerified?: boolean | null;
  documentCount?: number | null;
  responseRatePercent?: number | null;
  reviewScore?: number | null;
  fraudFlags?: number | null;
  paymentHistoryCount?: number | null;
}) {
  return [
    {
      label: "Verified organization",
      status: input.organizationVerified ? "positive" : "pending",
      helper: input.organizationVerified
        ? "Admin has reviewed this organization profile."
        : "Organization verification is still pending.",
    },
    {
      label: "Reviewed documents",
      status: Number(input.documentCount || 0) > 0 ? "positive" : "pending",
      helper:
        Number(input.documentCount || 0) > 0
          ? `${input.documentCount} public document signal(s) available.`
          : "Ask for documents before payment or offer commitment.",
    },
    {
      label: "Response quality",
      status: Number(input.responseRatePercent || 0) >= 70 ? "positive" : "pending",
      helper:
        input.responseRatePercent != null
          ? `${input.responseRatePercent}% response signal from workspace activity.`
          : "Response data will improve as leads and viewings are handled.",
    },
    {
      label: "Fraud review",
      status: Number(input.fraudFlags || 0) > 0 ? "review" : "positive",
      helper:
        Number(input.fraudFlags || 0) > 0
          ? "There are flags that need human moderation before high-risk action."
          : "No visible fraud flags on this listing signal.",
    },
    {
      label: "Payment history",
      status: Number(input.paymentHistoryCount || 0) > 0 ? "positive" : "pending",
      helper:
        Number(input.paymentHistoryCount || 0) > 0
          ? "Tracked payment history exists in BaytMiftah."
          : "No completed platform payment history yet.",
    },
  ];
}

export function getReferralRewardStatusDisplay(status: ReferralRewardStatus | string) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        helper: "Reward approved and waiting for payout batch.",
        tone: "positive",
      };
    case "paid":
      return {
        label: "Paid",
        helper: "Reward has been marked paid by operations.",
        tone: "positive",
      };
    case "rejected":
      return {
        label: "Rejected",
        helper: "Reward rejected after review.",
        tone: "critical",
      };
    case "fraud_hold":
      return {
        label: "Fraud hold",
        helper: "Reward paused for manual fraud and accounting review.",
        tone: "warning",
      };
    default:
      return {
        label: "Pending review",
        helper: "Reward is captured, but payout requires approval.",
        tone: "pending",
      };
  }
}

export function buildCommunityPrompts(input: {
  city?: string | null;
  region?: string | null;
  neighborhood?: string | null;
}) {
  const area = [input.neighborhood, input.city, input.region].filter(Boolean).join(", ") || "this area";

  return [
    {
      type: "question",
      title: `Ask neighbors about ${area}`,
      prompt: "How reliable are water, power, drainage, traffic, and security around this property?",
    },
    {
      type: "emergency_alert",
      title: "Emergency broadcast readiness",
      prompt: "Flood, fire, security, and utility outage alerts remain moderation-gated before public broadcast.",
    },
    {
      type: "local_guide",
      title: "Local guide contribution",
      prompt: "Invite verified residents or agents to submit area notes for admin moderation.",
    },
  ];
}

export function buildHumanReviewedFraudSignals(input: {
  listingPrice?: number | null;
  areaAveragePrice?: number | null;
  mediaCount?: number | null;
  organizationVerified?: boolean | null;
}) {
  const price = Number(input.listingPrice || 0);
  const average = Number(input.areaAveragePrice || 0);
  const suspiciousDiscount =
    price > 0 && average > 0 ? ((average - price) / average) * 100 : 0;

  return [
    {
      key: "suspicious_price",
      active: suspiciousDiscount >= 35,
      severity: suspiciousDiscount >= 50 ? "high" : "medium",
      label: "Suspicious pricing",
      helper:
        suspiciousDiscount >= 35
          ? `Price is about ${Math.round(suspiciousDiscount)}% below the area average. Send to human review.`
          : "No major price anomaly from available area data.",
    },
    {
      key: "thin_media",
      active: Number(input.mediaCount || 0) < 3,
      severity: "medium",
      label: "Thin media set",
      helper:
        Number(input.mediaCount || 0) < 3
          ? "Listing needs more photos or video before strong remote trust."
          : "Media set is strong enough for first-pass review.",
    },
    {
      key: "identity_readiness",
      active: !input.organizationVerified,
      severity: "medium",
      label: "Identity readiness",
      helper: input.organizationVerified
        ? "Organization identity has been reviewed."
        : "Identity/liveness checks are readiness-gated and require manual review.",
    },
  ];
}

export function buildInvestmentScorePreview(input: {
  price?: number | null;
  rentalYieldPercent?: number | null;
  locationConfidence?: number | null;
  documentVerified?: boolean | null;
  marketDemand?: "low" | "medium" | "high" | string | null;
}) {
  const yieldScore = Math.min(30, Math.max(0, Number(input.rentalYieldPercent || 0) * 3));
  const locationScore = Math.min(25, Math.max(0, Number(input.locationConfidence || 0) * 0.25));
  const documentScore = input.documentVerified ? 20 : 5;
  const demandScore =
    input.marketDemand === "very_high"
      ? 25
      : input.marketDemand === "high"
        ? 22
        : input.marketDemand === "medium"
          ? 16
          : input.marketDemand === "low"
            ? 8
            : 10;
  const score = Math.round(Math.min(100, yieldScore + locationScore + documentScore + demandScore));
  const confidence = Math.round(
    Math.min(
      100,
      (input.price ? 25 : 0) +
        (input.rentalYieldPercent ? 25 : 0) +
        (input.locationConfidence ? 25 : 0) +
        (input.documentVerified ? 25 : 0)
    )
  );

  return {
    score,
    confidence,
    status: confidence >= 75 ? "ready_for_human_review" : "needs_more_data",
    disclosure:
      "Investment scoring is informational only. It must be reviewed by a human and is not investment, legal, tax, or lending advice.",
    drivers: [
      `Yield signal contributes ${Math.round(yieldScore)}/30.`,
      `Location confidence contributes ${Math.round(locationScore)}/25.`,
      input.documentVerified
        ? "Document review improves trust confidence."
        : "Document verification is still needed before publishing investment claims.",
      `Demand signal is ${input.marketDemand || "not yet calibrated"}.`,
    ],
  };
}

export function buildConstructionProgressPreview(input: {
  progressPercent?: number | null;
  observedAt?: string | null;
  estimatedCompletionDate?: string | null;
  updateCount?: number | null;
}) {
  const progress = Math.max(0, Math.min(100, Number(input.progressPercent || 0)));
  const updateCount = Number(input.updateCount || 0);
  const hasCompletionDate = Boolean(input.estimatedCompletionDate);
  const confidence = Math.min(100, Math.round(progress * 0.45 + updateCount * 12 + (hasCompletionDate ? 25 : 0)));

  return {
    progress,
    confidence,
    status:
      progress >= 95
        ? "handover_ready"
        : confidence >= 70
          ? "forecast_ready"
          : "needs_verified_updates",
    headline:
      progress >= 95
        ? "Project appears close to handover, pending verified completion evidence."
        : confidence >= 70
          ? "Progress forecast has enough signal for buyer monitoring."
          : "Add verified photos, update dates, and completion estimates before publishing strong forecasts.",
    checklist: [
      updateCount > 0 ? `${updateCount} progress update(s) available.` : "Add a construction progress update.",
      input.observedAt ? `Last observed ${input.observedAt}.` : "Add an observation date.",
      hasCompletionDate ? `Estimated completion ${input.estimatedCompletionDate}.` : "Add estimated completion date.",
      "Developer and project claims should remain human-reviewed before public promotion.",
    ],
  };
}

export function buildContributorMonetizationPreview(input: {
  contributionCount?: number | null;
  approvedCount?: number | null;
  payoutStatus?: string | null;
}) {
  const contributionCount = Number(input.contributionCount || 0);
  const approvedCount = Number(input.approvedCount || 0);
  const approvalRate = contributionCount > 0 ? Math.round((approvedCount / contributionCount) * 100) : 0;

  return {
    approvalRate,
    payoutReady: input.payoutStatus === "verified",
    status:
      input.payoutStatus === "verified"
        ? "payout_ready"
        : contributionCount > 0
          ? "content_review"
          : "not_started",
    checklist: [
      contributionCount > 0
        ? `${contributionCount} contribution${contributionCount === 1 ? "" : "s"} submitted.`
        : "Submit area guides, photos, or field reports for moderation.",
      `${approvedCount} contribution${approvedCount === 1 ? "" : "s"} approved.`,
      input.payoutStatus === "verified"
        ? "Payout profile is verified."
        : "Payout profile, tax note, and contributor terms need review before money moves.",
    ],
  };
}

export function buildAffordabilityPlanGuardrails(input: {
  planType?: string | null;
  providerKey?: string | null;
  legalReviewRequired?: boolean | null;
}) {
  return {
    canGoLive: Boolean(input.providerKey) && input.legalReviewRequired === false,
    label:
      input.planType === "weekly_rent"
        ? "Weekly rent plan"
        : input.planType === "daily_rent"
          ? "Daily rent plan"
          : input.planType === "bnpl_partner"
            ? "BNPL partner plan"
            : input.planType === "ussd_handoff"
              ? "USSD payment handoff"
              : "Affordability plan",
    guardrails: [
      "Provider contract must be approved before activation.",
      "Terms must avoid BaytMiftah acting as an unlicensed lender.",
      "Buyer/renter consent, fees, refund rules, and missed-payment handling must be explicit.",
      "Plans should route through PaymentService, never direct SDK imports in product logic.",
    ],
  };
}
