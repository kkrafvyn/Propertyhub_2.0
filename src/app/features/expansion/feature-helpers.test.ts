import { describe, expect, it } from "vitest";
import {
  buildAgentPerformanceSnapshot,
  buildAgentCrmActions,
  buildAiConciergePrompts,
  buildDealTimeline,
  buildEscrowMilestones,
  buildInspectionChecklist,
  buildBuyerNegotiationPlan,
  buildListingTrustScore,
  buildRemoteBuyerReadiness,
  buildRentVsBuyAnalysis,
  buildViewingPrepPlan,
  buildListingLaunchPlan,
  buildSellerPortalHealth,
  buildSellerNetSheet,
  estimateClosingCosts,
  buildOfferSuggestion,
  buildPropertyComparisonRows,
  calculateMonthlyMortgage,
  parseOfferSummary,
} from "./feature-helpers";

describe("feature helpers", () => {
  it("builds comparison rows including amenity availability", () => {
    const rows = buildPropertyComparisonRows([
      {
        id: "listing-1",
        title: "Cantonments Flat",
        address: "Cantonments Road",
        city: "Accra",
        region: "Greater Accra",
        price: 1200000,
        currency: "GHS",
        listingType: "sale",
        category: "apartment",
        bedrooms: 3,
        bathrooms: 2,
        squareMeters: 180,
        amenities: ["Pool", "Backup power"],
        qualityScore: 88,
        floodRiskLevel: "low",
        locationConfidence: 92,
      },
      {
        id: "listing-2",
        title: "East Legon Home",
        address: "East Legon Hills",
        city: "Accra",
        region: "Greater Accra",
        price: 980000,
        currency: "GHS",
        listingType: "sale",
        category: "house",
        bedrooms: 4,
        bathrooms: 3,
        squareMeters: 240,
        amenities: ["Backup power"],
        qualityScore: 81,
        floodRiskLevel: "medium",
        locationConfidence: 86,
      },
    ]);

    const priceValues = rows.find((row) => row.label === "Price")?.values || [];

    expect(priceValues[0]).toContain("1,200,000");
    expect(priceValues[1]).toContain("980,000");
    expect(rows.find((row) => row.label === "Pool")?.values).toEqual([
      "Included",
      "Not listed",
    ]);
  });

  it("builds offer suggestions from pricing and urgency", () => {
    expect(
      buildOfferSuggestion({
        listingPrice: 1_000_000,
        caseType: "purchase_offer",
        priority: "urgent",
      })
    ).toEqual({
      anchor: 940000,
      stretch: 980000,
      closeTarget: 960000,
    });
  });

  it("parses offer summaries into structured buyer tracking details", () => {
    expect(
      parseOfferSummary(`Offer submitted for 5 Independence Ave, Accra

Offer amount: GHS 1,250,000
Financing: cash
Target close date: 2026-06-30
Buyer: Ama Mensah
Phone: +233240000000

Ready to move after title review.`)
    ).toEqual({
      amount: 1250000,
      financing: "cash",
      targetCloseDate: "2026-06-30",
      buyerName: "Ama Mensah",
      buyerPhone: "+233240000000",
      notes: "Ready to move after title review.",
    });
  });

  it("strips referral metadata from timeline message previews", () => {
    const timeline = buildDealTimeline({
      dealCase: null,
      messages: [
        {
          id: "message-1",
          content:
            "Offer submitted for Cantonments flat\n\n<!-- propertyhub:referral {\"ref\":\"user-1\",\"channel\":\"diaspora\"} -->",
          created_at: "2026-05-14T10:00:00.000Z",
        },
      ],
    });

    expect(timeline[0]?.description).toContain("Offer submitted for Cantonments flat");
    expect(timeline[0]?.description).not.toContain("propertyhub:referral");
  });

  it("aggregates agent performance across cases, viewings, and payments", () => {
    const rows = buildAgentPerformanceSnapshot({
      cases: [
        {
          id: "case-1",
          assigned_to: "agent-1",
          pipeline_stage: "negotiation",
          status: "pending",
        },
        {
          id: "case-2",
          assigned_to: "agent-1",
          pipeline_stage: "won",
          status: "closed",
        },
      ],
      viewings: [
        {
          id: "viewing-1",
          assigned_to: "agent-1",
          status: "completed",
        },
      ],
      payments: [
        {
          id: "payment-1",
          assigned_to: "agent-1",
          status: "success",
          amount_minor: 250000,
          receipt: { blockchain_status: "confirmed" },
        },
      ],
      members: {
        "agent-1": {
          full_name: "Ada Mensah",
        },
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Ada Mensah",
      activeLeads: 1,
      negotiations: 1,
      wonDeals: 1,
      assignedViewings: 1,
      completedViewings: 1,
      verifiedPayments: 1,
      collectedRevenueMinor: 250000,
    });
  });

  it("calculates a non-zero monthly mortgage estimate", () => {
    expect(calculateMonthlyMortgage(800000, 18, 20)).toBeGreaterThan(0);
  });

  it("estimates buyer closing costs with a reserve", () => {
    const estimate = estimateClosingCosts({
      price: 1_000_000,
      listingType: "sale",
      inspectionFee: 2_000,
    });

    expect(estimate.total).toBeGreaterThan(40_000);
    expect(estimate.recommendedReserve).toBeGreaterThan(estimate.total);
    expect(estimate.lineItems.map((item) => item.label)).toContain("Stamp duty and registration");
  });

  it("compares rent and buy paths for buyer decision support", () => {
    const analysis = buildRentVsBuyAnalysis({
      purchasePrice: 1_000_000,
      monthlyRent: 6_000,
      annualRatePercent: 12,
      ownershipYears: 7,
    });

    expect(analysis.monthlyOwnershipCost).toBeGreaterThan(analysis.monthlyRentCost);
    expect(analysis.totalOwnershipCost).toBeGreaterThan(0);
    expect(analysis.recommendation).toContain("Buying");
  });

  it("builds a listing trust score from verification, address, media, and document signals", () => {
    const trust = buildListingTrustScore({
      listing: { quality_score: 90, verification_status: "verified" },
      organization: { verified: true },
      property: {
        location_confidence: 88,
        ghana_post_gps: "GA-123-4567",
        latitude: 5.56,
        longitude: -0.2,
      },
      mediaCount: 6,
      trustSnapshot: { publicDocumentCount: 2 },
    });

    expect(trust.score).toBeGreaterThanOrEqual(85);
    expect(trust.label).toBe("High trust");
    expect(trust.signals.every((signal) => signal.label)).toBe(true);
  });

  it("builds escrow milestones for safe buyer payment progression", () => {
    const milestones = buildEscrowMilestones({
      listingType: "sale",
      hasViewing: true,
      hasOffer: true,
      hasDocuments: false,
      hasPayment: false,
      hasVerification: true,
    });

    expect(milestones).toHaveLength(5);
    expect(milestones.filter((milestone) => milestone.complete)).toHaveLength(3);
    expect(milestones.map((milestone) => milestone.label)).toContain("Title and agreement review");
  });

  it("generates listing-specific concierge prompts", () => {
    const prompts = buildAiConciergePrompts({
      listing_type: "sale",
      property: { address: "Osu Apartment", city: "Accra" },
    });

    expect(prompts.join(" ")).toContain("Osu Apartment");
    expect(prompts.join(" ")).toContain("offer");
  });

  it("scores remote buyer readiness from address, media, documents, and verification", () => {
    const readiness = buildRemoteBuyerReadiness({
      listing: {
        verification_status: "verified",
        organization: { verified: true },
        property: {
          ghana_post_gps: "GA-123-4567",
          media: [
            { media_type: "photo" },
            { media_type: "photo" },
            { media_type: "photo" },
            { media_type: "photo" },
            { media_type: "photo" },
          ],
        },
      },
      trustSnapshot: { publicDocumentCount: 1, organizationVerified: true },
    });

    expect(readiness.score).toBe(100);
    expect(readiness.label).toBe("Ready");
  });

  it("builds an inspection checklist tuned to listing type and media coverage", () => {
    const checklist = buildInspectionChecklist({
      listing: {
        listing_type: "sale",
        property: { category: "house", flood_risk_level: "high" },
      },
    });

    expect(checklist.map((item) => item.label)).toContain("Title, mandate, and ownership trail");
    expect(checklist.some((item) => item.priority === "urgent")).toBe(true);
  });

  it("builds a buyer negotiation plan from trust, readiness, and market pressure", () => {
    const plan = buildBuyerNegotiationPlan({
      listing: {
        price: 1_000_000,
        currency: "GHS",
        listing_type: "sale",
        property: { address: "Airport Hills House" },
      },
      trustScore: 88,
      readinessScore: 60,
      mediaReadinessScore: 40,
      closingReserve: 60_000,
      activeDemand: "low",
    });

    expect(plan.anchor).toBe(890000);
    expect(plan.target).toBe(940000);
    expect(plan.leverage).toBe("Buyer leverage");
    expect(plan.confidence).toBe("Cautious");
    expect(plan.message).toContain("Airport Hills House");
  });

  it("builds a viewing prep plan for remote and representative visits", () => {
    const plan = buildViewingPrepPlan({
      listing: { listing_type: "rental" },
      property: {
        ghana_post_gps: "GA-123-4567",
        latitude: 5.56,
        longitude: -0.2,
        flood_risk_level: "medium",
      },
      mediaItems: [{ media_type: "video" }, { media_type: "photo" }],
      readinessScore: 82,
    });

    expect(plan.mode).toBe("Remote-first");
    expect(plan.checklist.map((item) => item.label)).toContain("Utilities and service test");
    expect(plan.arrivalNotes.join(" ")).toContain("GA-123-4567");
  });

  it("prioritizes CRM actions from leads, cases, viewings, and payments", () => {
    const actions = buildAgentCrmActions({
      leads: [{ id: "lead-1", lead_score: 92 }],
      cases: [
        {
          id: "case-1",
          status: "pending",
          created_at: "2000-01-01T00:00:00.000Z",
          updated_at: "2000-01-01T00:00:00.000Z",
        },
      ],
      viewings: [{ id: "viewing-1", status: "requested" }],
      payments: [{ id: "payment-1", status: "pending" }],
    });

    expect(actions.map((action) => action.count)).toEqual([1, 1, 1, 1]);
  });

  it("summarizes seller portal health from listings and deal evidence", () => {
    const health = buildSellerPortalHealth({
      listings: [
        { id: "listing-1", status: "listed", quality_score: 80 },
        { id: "listing-2", status: "draft", quality_score: 60 },
      ],
      cases: [{ id: "case-1", status: "pending" }],
      documents: [{ id: "document-1", status: "signed" }],
      payments: [{ id: "payment-1", status: "success" }],
    });

    expect(health.listedCount).toBe(1);
    expect(health.score).toBeGreaterThan(0);
    expect(health.actions).toHaveLength(4);
  });

  it("builds a seller net sheet from active pipeline value and modeled reserves", () => {
    const netSheet = buildSellerNetSheet({
      listings: [{ id: "listing-1", status: "listed", price: 900_000 }],
      cases: [
        {
          id: "case-1",
          status: "pending",
          listing: { price: 1_000_000 },
        },
      ],
      payments: [{ id: "payment-1", status: "success", amount_minor: 250_000_00 }],
      commissionPercent: 3,
      sellerClosingPercent: 1,
      repairReservePercent: 1,
      marketingPercent: 0.5,
    });

    expect(netSheet.activePipelineValue).toBe(1_000_000);
    expect(netSheet.estimatedCommission).toBe(30_000);
    expect(netSheet.ownerNetProjection).toBe(945_500);
    expect(netSheet.collectedProofValue).toBe(250_000);
    expect(netSheet.lineItems.map((item) => item.label)).toContain("Agency commission reserve");
  });

  it("builds a listing launch plan for owner update readiness", () => {
    const plan = buildListingLaunchPlan({
      listings: [
        { id: "listing-1", status: "listed", quality_score: 82 },
        { id: "listing-2", status: "draft", quality_score: 58 },
      ],
      cases: [{ id: "case-1", status: "pending" }],
      documents: [{ id: "document-1", status: "signed" }],
    });

    expect(plan.readyCount).toBe(1);
    expect(plan.needsWorkCount).toBe(2);
    expect(plan.actions.find((action) => action.label === "Attach seller proof")?.status).toBe("ready");
    expect(plan.ownerUpdate).toContain("1/2");
  });
});
