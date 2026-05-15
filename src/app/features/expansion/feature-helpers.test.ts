import { describe, expect, it } from "vitest";
import {
  buildAgentPerformanceSnapshot,
  buildDealTimeline,
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
});
