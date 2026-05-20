import { describe, expect, it } from "vitest";
import {
  buildAiListingDraft,
  buildMediaReadinessLabels,
  buildReviewSummary,
  calculateBuyerFinance,
  canMarkReviewVerified,
  selectRecommendationRails,
} from "./competitive-features.service";

describe("competitive feature helpers", () => {
  it("summarizes approved and verified reviews", () => {
    const summary = buildReviewSummary({
      reviews: [
        { rating: 5, verified: true, status: "approved" },
        { rating: 4, verified: false, status: "approved" },
        { rating: 1, verified: false, status: "submitted" },
      ],
    });

    expect(summary.averageRating).toBe(4.5);
    expect(summary.reviewCount).toBe(2);
    expect(summary.verifiedShare).toBe(50);
  });

  it("marks reviews verified only when a platform workflow is linked", () => {
    expect(canMarkReviewVerified({ viewingId: "viewing-1" })).toEqual({
      verified: true,
      source: "viewing",
    });
    expect(canMarkReviewVerified({})).toEqual({ verified: false, source: null });
  });

  it("calculates buyer finance estimates with a disclaimer", () => {
    const result = calculateBuyerFinance({
      price: 1_000_000,
      monthlyRentEstimate: 8_000,
    });

    expect(result.downPayment).toBe(200_000);
    expect(result.closingCosts).toBe(45_000);
    expect(result.monthlyMortgage).toBeGreaterThan(0);
    expect(result.disclaimer).toContain("informational only");
  });

  it("scores media readiness across video, tours, drone, and renovation media", () => {
    const result = buildMediaReadinessLabels({
      media: [
        { media_type: "photo" },
        { media_type: "photo" },
        { media_type: "video" },
        { media_type: "virtual_tour" },
        { media_type: "drone" },
        { media_type: "renovation_before_after" },
      ],
    });

    expect(result.videos).toBe(1);
    expect(result.virtualTours).toBe(1);
    expect(result.drone).toBe(1);
    expect(result.renovation).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("builds editable AI listing drafts without publishing automatically", () => {
    const draft = buildAiListingDraft({
      address: "12 Osu Avenue",
      city: "Accra",
      neighborhood: "Osu",
      category: "office_complex",
      listingType: "lease",
      amenities: "Parking, Backup power",
    });

    expect(draft.title).toContain("for lease");
    expect(draft.description).toContain("BaytMiftah recommends");
    expect(draft.neighborhoodCopy).toContain("Osu");
  });

  it("selects recommendation rails from public listings", () => {
    const rails = selectRecommendationRails(
      [
        { id: "current", property: { category: "apartment" } },
        { id: "one", organization: { verified: true }, property: { category: "apartment" } },
        { id: "two", property: { category: "office" }, published_at: "2026-05-01" },
        { id: "three", previous_price: 1200, property: { category: "apartment" } },
      ],
      { id: "current", property: { category: "apartment" } }
    );

    expect(rails.similarVerified.map((listing) => listing.id)).toContain("one");
    expect(rails.priceChanged.map((listing) => listing.id)).toContain("three");
    expect(rails.youMightLike.length).toBeGreaterThan(0);
  });
});
