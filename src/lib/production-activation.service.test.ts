import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAffordabilityEnrollmentPayload,
  buildCommunityBroadcastPayload,
  buildHyperlocalObservationPayload,
  buildInvestmentScoreReviewPayload,
  buildLegalComplianceSignoffPayload,
  buildProviderConnectorPlan,
  buildProviderIntegrationRunPayload,
  implementedProductionActivationFunctionNames,
} from "./production-activation.service";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const migration = read("supabase/migrations/20260523110000_production_activation_depth.sql");

describe("production activation service", () => {
  it("plans provider connectors without exposing secrets", () => {
    const ghanaCard = buildProviderConnectorPlan({
      providerKey: "ghana_card_liveness",
      configuredEnvKeys: ["GHANA_CARD_API_ENDPOINT"],
    });
    const flood = buildProviderConnectorPlan({
      providerKey: "flood_drainage_feed",
      configuredEnvKeys: ["FLOOD_DATA_ENDPOINT", "HYPERLOCAL_DATA_API_KEY"],
    });

    expect(ghanaCard.canAttemptLiveConnection).toBe(false);
    expect(ghanaCard.missingEnvKeys).toContain("GHANA_CARD_API_KEY");
    expect(ghanaCard.manualFallback).toBe("manual_identity_review");
    expect(ghanaCard.secretsStayServerSide).toBe(true);
    expect(flood.canAttemptLiveConnection).toBe(true);
  });

  it("records provider runs as evidence, not credentials", () => {
    const payload = buildProviderIntegrationRunPayload({
      providerCategory: "fraud",
      providerKey: "image_authenticity",
      runType: "connectivity_check",
      status: "needs_review",
      evidence: { sample: "listing-photo-1" },
    });

    expect(payload.status).toBe("needs_review");
    expect(payload.metadata.api_keys_stored_here).toBe(false);
    expect(payload.evidence).toEqual({ sample: "listing-photo-1" });
  });

  it("keeps legal signoff counsel gated until approved", () => {
    const draft = buildLegalComplianceSignoffPayload({
      domain: "iot_privacy",
      policyTitle: "Smart Access Privacy Rules",
      riskSummary: "Entry metadata must not expose private movement patterns.",
    });
    const approved = buildLegalComplianceSignoffPayload({
      domain: "escrow",
      policyTitle: "Escrow and Refund Policy",
      status: "approved",
      reviewerName: "Counsel",
    });

    expect(draft.metadata.counsel_review_required).toBe(true);
    expect(approved.metadata.counsel_review_required).toBe(false);
    expect(approved.reviewed_at).toBeTruthy();
  });

  it("normalizes hyperlocal observations and preserves source disclosure", () => {
    const payload = buildHyperlocalObservationPayload({
      signalType: "flood",
      region: "Greater Accra",
      neighborhood: "Kaneshie",
      severity: "critical",
      confidenceScore: 120,
      publicSummary: "Recent flooding reported near low drainage corridor.",
    });

    expect(payload.confidence_score).toBe(100);
    expect(payload.metadata.source_disclosure_required).toBe(true);
    expect(payload.severity).toBe("critical");
  });

  it("keeps external community broadcasts queued behind provider readiness", () => {
    const payload = buildCommunityBroadcastPayload({
      broadcastType: "flood_warning",
      title: "Flood warning",
      body: "Avoid low-lying routes for the next two hours.",
      channels: ["in_app", "sms", "whatsapp"],
    });

    expect(payload.status).toBe("queued");
    expect(payload.metadata.external_provider_required).toBe(true);
    expect(payload.metadata.moderation_required).toBe(true);
  });

  it("keeps affordability enrollments and investment scores review-first", () => {
    const enrollment = buildAffordabilityEnrollmentPayload({
      planId: "plan-1",
      amountMinor: 250000,
      providerKey: "paystack",
      legalDisclaimerAcceptedAt: "2026-05-23T10:00:00.000Z",
    });
    const score = buildInvestmentScoreReviewPayload({
      listingId: "listing-1",
      score: 84,
      confidenceScore: 71,
      rationale: "Strong rental demand and transport access.",
    });

    expect(enrollment.status).toBe("pending_kyc");
    expect(enrollment.metadata.lender_decisioning).toBe(false);
    expect(score.status).toBe("human_review");
    expect(score.metadata.not_financial_advice).toBe(true);
  });

  it("adds migration-backed production activation tables with RLS and grants", () => {
    for (const tableName of [
      "provider_integration_runs",
      "legal_compliance_signoffs",
      "hyperlocal_observations",
      "community_broadcasts",
      "community_chat_threads",
      "community_chat_messages",
      "affordability_plan_enrollments",
      "investment_score_reviews",
      "contributor_marketplace_listings",
      "construction_forecasts",
      "developer_verifications",
      "white_label_packages",
      "commission_rules",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
      expect(migration).toContain(`'${tableName}'`);
    }

    expect(migration).toContain("ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE ON");
    expect(migration).toContain("external_provider_readiness");
    expect(migration).not.toContain("secret_key TEXT");
    expect(migration).not.toContain("api_key TEXT");
  });

  it("documents all production activation functions for handoff", () => {
    expect(implementedProductionActivationFunctionNames).toEqual(
      expect.arrayContaining([
        "buildProviderConnectorPlan",
        "recordProviderIntegrationRun",
        "upsertLegalComplianceSignoff",
        "recordHyperlocalObservation",
        "createCommunityBroadcast",
        "createCommunityChatThread",
        "createCommunityChatMessage",
        "enrollAffordabilityPlan",
        "createInvestmentScoreReview",
        "createContributorMarketplaceListing",
        "createConstructionForecast",
        "createDeveloperVerification",
        "upsertWhiteLabelPackage",
        "upsertCommissionRule",
      ])
    );
  });
});
