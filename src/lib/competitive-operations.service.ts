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

export function calculateAgencyTrustScore(input: {
  organizationVerified?: boolean | null;
  documentCount?: number | null;
  responseRatePercent?: number | null;
  reviewScore?: number | null;
  fraudFlags?: number | null;
  paymentHistoryCount?: number | null;
}) {
  const orgScore = input.organizationVerified ? 22 : 6;
  const documentScore = Math.min(22, Number(input.documentCount || 0) * 7);
  const responseScore = Math.min(18, Math.max(0, Number(input.responseRatePercent || 0) * 0.18));
  const reviewScore = Math.min(18, Math.max(0, Number(input.reviewScore || 0) * 3.6));
  const paymentScore = Math.min(12, Number(input.paymentHistoryCount || 0) * 3);
  const fraudPenalty = Math.min(28, Number(input.fraudFlags || 0) * 10);
  const score = Math.max(0, Math.min(100, Math.round(orgScore + documentScore + responseScore + reviewScore + paymentScore - fraudPenalty)));

  return {
    score,
    label: score >= 80 ? "Strong trust signal" : score >= 60 ? "Moderate trust signal" : "Needs more verification",
    disclosure:
      "Trust score is an operational signal, not a guarantee. Buyers should still verify documents and use protected payment flows.",
    drivers: buildTrustExplanationSignals(input).map((signal) => signal.helper),
  };
}

export function buildSmartComparisonDecision(
  properties: Array<{
    id: string;
    title?: string | null;
    address?: string | null;
    price?: number | null;
    qualityScore?: number | null;
    locationConfidence?: number | null;
    floodRiskLevel?: string | null;
    amenities?: string[] | null;
  }>
) {
  const scored = properties.map((property) => {
    const price = Number(property.price || 0);
    const priceScore = price > 0 ? Math.max(0, 25 - Math.min(25, price / 100000)) : 8;
    const trustScore = Math.min(35, Math.max(0, Number(property.qualityScore || 0) * 0.35));
    const locationScore = Math.min(20, Math.max(0, Number(property.locationConfidence || 0) * 0.2));
    const floodScore =
      property.floodRiskLevel === "low"
        ? 12
        : property.floodRiskLevel === "medium"
          ? 6
          : property.floodRiskLevel === "high"
            ? 0
            : 4;
    const amenityScore = Math.min(8, (property.amenities || []).length);
    const score = Math.round(priceScore + trustScore + locationScore + floodScore + amenityScore);

    return {
      ...property,
      score,
      strengths: [
        trustScore >= 25 ? "strong trust quality" : "trust proof needs review",
        locationScore >= 14 ? "good address confidence" : "location should be confirmed",
        floodScore >= 10 ? "lower flood-risk signal" : "ask about drainage and flood history",
      ],
    };
  });
  const winner = [...scored].sort((a, b) => b.score - a.score)[0] || null;

  return {
    winner,
    scored,
    guidance: winner
      ? `${winner.address || winner.title || "The leading option"} currently has the strongest combined price, trust, location, and risk signal.`
      : "Save at least two listings to generate a comparison recommendation.",
    disclaimer: "Recommendation is informational and should not replace inspection, legal checks, or payment protection.",
  };
}

export function buildWhatsAppAlertReadiness(input: {
  phone?: string | null;
  consentGiven?: boolean | null;
  providerConfigured?: boolean | null;
  alertCount?: number | null;
}) {
  const missing = [
    input.phone ? null : "Add a WhatsApp-capable phone number.",
    input.consentGiven ? null : "Capture WhatsApp opt-in consent and opt-out wording.",
    input.providerConfigured ? null : "Configure WhatsApp/SMS provider credentials server-side.",
  ].filter(Boolean) as string[];

  return {
    canEnable: missing.length === 0,
    alertCount: Number(input.alertCount || 0),
    status: missing.length === 0 ? "ready" : "gated",
    checklist: missing.length
      ? missing
      : [
          "Send price drops, new matches, viewing reminders, and escrow updates through approved templates.",
          "Respect quiet hours, opt-out, and abuse controls.",
        ],
  };
}

export function buildManualVerificationChecklist(input: {
  hasGhanaCardProvider?: boolean | null;
  hasRegistryProvider?: boolean | null;
  legalApproved?: boolean | null;
}) {
  return {
    canAutomate: Boolean(input.hasGhanaCardProvider && input.hasRegistryProvider && input.legalApproved),
    steps: [
      {
        label: "Ghana Card / liveness",
        status: input.hasGhanaCardProvider ? "provider_ready" : "manual_review",
        helper: input.hasGhanaCardProvider
          ? "Vendor can process consented identity checks."
          : "Use manual ID review until vendor, consent, and DPIA are approved.",
      },
      {
        label: "Lands Commission / title check",
        status: input.hasRegistryProvider ? "provider_ready" : "manual_review",
        helper: input.hasRegistryProvider
          ? "Registry check lane is configured."
          : "Use manual title evidence review and counsel-approved wording.",
      },
      {
        label: "Legal approval",
        status: input.legalApproved ? "approved" : "blocked",
        helper: input.legalApproved
          ? "Automation can move toward live launch."
          : "Keep high-risk verification outcomes human-reviewed until counsel signs off.",
      },
    ],
  };
}

export function buildOwnerReportingSnapshot(input: {
  listingViews?: number | null;
  inquiries?: number | null;
  viewings?: number | null;
  offers?: number | null;
  verifiedDocuments?: number | null;
  escrowHeldMinor?: number | null;
}) {
  const listingViews = Number(input.listingViews || 0);
  const inquiries = Number(input.inquiries || 0);
  const viewings = Number(input.viewings || 0);
  const offers = Number(input.offers || 0);
  const verifiedDocuments = Number(input.verifiedDocuments || 0);
  const health = Math.min(
    100,
    Math.round(
      Math.min(25, listingViews / 20) +
        Math.min(20, inquiries * 4) +
        Math.min(20, viewings * 5) +
        Math.min(20, offers * 10) +
        Math.min(15, verifiedDocuments * 5)
    )
  );

  return {
    health,
    ownerSummary:
      health >= 75
        ? "Owner report is strong enough for a confident weekly update."
        : "Owner report needs more demand, verification, or viewing evidence before strong claims.",
    metrics: [
      { label: "Listing views", value: listingViews },
      { label: "Inquiries", value: inquiries },
      { label: "Viewings", value: viewings },
      { label: "Offers", value: offers },
      { label: "Verified documents", value: verifiedDocuments },
      { label: "Escrow held", value: Number(input.escrowHeldMinor || 0) },
    ],
  };
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
