import { describe, expect, it } from "vitest";
import {
  buildAffordabilityPlanGuardrails,
  buildCommunityPrompts,
  buildConstructionProgressPreview,
  buildContributorMonetizationPreview,
  buildDocumentTemplateDrafts,
  buildHumanReviewedFraudSignals,
  buildInvestmentScorePreview,
  buildManualVerificationChecklist,
  buildOwnerReportingSnapshot,
  buildSmartComparisonDecision,
  buildTrustExplanationSignals,
  buildViewingCalendarExports,
  buildWhatsAppAlertReadiness,
  calculateAgencyTrustScore,
  getReferralRewardStatusDisplay,
} from "./competitive-operations.service";

describe("competitive operations helpers", () => {
  it("builds review-first document templates", () => {
    const drafts = buildDocumentTemplateDrafts({
      organizationName: "Cedar Homes",
      propertyAddress: "12 Osu Avenue",
      listingType: "sale",
      price: 950000,
      currency: "GHS",
    });

    expect(drafts.map((draft) => draft.key)).toContain("offer_letter");
    expect(drafts.find((draft) => draft.key === "offer_letter")?.legalGate).toBe(true);
    expect(drafts[0].body).toContain("12 Osu Avenue");
  });

  it("creates provider-neutral calendar export options", () => {
    const result = buildViewingCalendarExports({
      title: "Viewing",
      startsAt: "2026-05-20T10:00:00.000Z",
      location: "Accra",
    });

    expect(result.ics).toContain("BEGIN:VCALENDAR");
    expect(result.googleUrl).toContain("calendar.google.com");
    expect(result.providerReadiness.join(" ")).toContain("readiness-gated");
  });

  it("explains trust signals without claiming final legal certainty", () => {
    const signals = buildTrustExplanationSignals({
      organizationVerified: true,
      documentCount: 2,
      fraudFlags: 1,
    });

    expect(signals.find((signal) => signal.label === "Fraud review")?.status).toBe("review");
    expect(signals.map((signal) => signal.label)).toContain("Payment history");
  });

  it("maps referral reward statuses for UI display", () => {
    expect(getReferralRewardStatusDisplay("fraud_hold")).toMatchObject({
      label: "Fraud hold",
      tone: "warning",
    });
    expect(getReferralRewardStatusDisplay("paid").helper).toContain("paid");
  });

  it("builds community prompts around a local area", () => {
    const prompts = buildCommunityPrompts({
      neighborhood: "Labone",
      city: "Accra",
      region: "Greater Accra",
    });

    expect(prompts[0].title).toContain("Labone");
    expect(prompts.map((prompt) => prompt.type)).toContain("emergency_alert");
  });

  it("keeps fraud outputs human reviewed", () => {
    const signals = buildHumanReviewedFraudSignals({
      listingPrice: 500,
      areaAveragePrice: 2000,
      mediaCount: 1,
      organizationVerified: false,
    });

    expect(signals.filter((signal) => signal.active).length).toBe(3);
    expect(signals[0].helper).toContain("human review");
  });

  it("builds investment score previews with human-review disclosure", () => {
    const preview = buildInvestmentScorePreview({
      price: 900000,
      rentalYieldPercent: 8,
      locationConfidence: 80,
      documentVerified: true,
      marketDemand: "high",
    });

    expect(preview.score).toBeGreaterThan(80);
    expect(preview.status).toBe("ready_for_human_review");
    expect(preview.disclosure).toContain("informational only");
  });

  it("builds construction progress readiness from update signals", () => {
    const preview = buildConstructionProgressPreview({
      progressPercent: 72,
      observedAt: "2026-05-01",
      estimatedCompletionDate: "2026-11-30",
      updateCount: 3,
    });

    expect(preview.confidence).toBeGreaterThan(70);
    expect(preview.checklist).toContain("3 progress update(s) available.");
  });

  it("summarizes contributor monetization without approving payouts", () => {
    const preview = buildContributorMonetizationPreview({
      contributionCount: 4,
      approvedCount: 2,
      payoutStatus: "pending_verification",
    });

    expect(preview.approvalRate).toBe(50);
    expect(preview.payoutReady).toBe(false);
    expect(preview.checklist.join(" ")).toContain("tax note");
  });

  it("keeps affordability plans behind legal and provider guardrails", () => {
    const guardrails = buildAffordabilityPlanGuardrails({
      planType: "weekly_rent",
      providerKey: "paystack",
      legalReviewRequired: true,
    });

    expect(guardrails.canGoLive).toBe(false);
    expect(guardrails.label).toBe("Weekly rent plan");
    expect(guardrails.guardrails.join(" ")).toContain("unlicensed lender");
  });

  it("calculates agency trust scores from explainable signals", () => {
    const score = calculateAgencyTrustScore({
      organizationVerified: true,
      documentCount: 3,
      responseRatePercent: 90,
      reviewScore: 4.5,
      paymentHistoryCount: 2,
      fraudFlags: 0,
    });

    expect(score.score).toBeGreaterThan(70);
    expect(score.disclosure).toContain("not a guarantee");
  });

  it("recommends a comparison winner without replacing due diligence", () => {
    const result = buildSmartComparisonDecision([
      { id: "a", address: "A", price: 900000, qualityScore: 70, locationConfidence: 80, floodRiskLevel: "medium" },
      { id: "b", address: "B", price: 750000, qualityScore: 92, locationConfidence: 90, floodRiskLevel: "low" },
    ]);

    expect(result.winner?.id).toBe("b");
    expect(result.disclaimer).toContain("inspection");
  });

  it("keeps WhatsApp alerts gated until consent and provider setup", () => {
    const readiness = buildWhatsAppAlertReadiness({
      phone: "+233240000000",
      consentGiven: false,
      providerConfigured: false,
      alertCount: 2,
    });

    expect(readiness.canEnable).toBe(false);
    expect(readiness.checklist.join(" ")).toContain("opt-in consent");
  });

  it("keeps Ghana Card and registry automation behind legal readiness", () => {
    const checklist = buildManualVerificationChecklist({
      hasGhanaCardProvider: false,
      hasRegistryProvider: false,
      legalApproved: false,
    });

    expect(checklist.canAutomate).toBe(false);
    expect(checklist.steps.map((step) => step.status)).toContain("manual_review");
  });

  it("builds owner reporting health from demand and proof signals", () => {
    const report = buildOwnerReportingSnapshot({
      listingViews: 600,
      inquiries: 7,
      viewings: 3,
      offers: 1,
      verifiedDocuments: 2,
      escrowHeldMinor: 2500000,
    });

    expect(report.health).toBeGreaterThan(60);
    expect(report.metrics).toHaveLength(6);
  });
});
