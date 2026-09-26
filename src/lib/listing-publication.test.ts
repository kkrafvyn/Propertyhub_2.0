import { describe, expect, it } from "vitest";
import { assertListingReadyForPublication } from "./listing.service";

describe("listing publication readiness", () => {
  const valid = {
    listing: {
      price: 250000,
      currency: "GHS",
      listing_type: "rental",
      organization: { verified: true },
      verification_status: "verified",
      title_document_status: "verified",
      whatsapp_enabled: true,
    },
    property: {
      address: "1 Test Street",
      city: "Accra",
      region: "Greater Accra",
      country: "Ghana",
      subdivision_code: "AA",
      ghana_post_gps: "GA-123-4567",
      description: "A comfortable home near schools, transport, shops, and daily services for residents.",
      category: "apartment",
    },
    mediaCount: 5,
  };

  it("accepts a complete listing", () => {
    expect(assertListingReadyForPublication(valid).score).toBeGreaterThan(0);
  });

  it("rejects listings with missing location data", () => {
    expect(() => assertListingReadyForPublication({
      ...valid,
      property: { ...valid.property, address: "" },
    })).toThrow("Street address");
  });

  it("rejects listings with failed quality checks", () => {
    expect(() => assertListingReadyForPublication({
      ...valid,
      mediaCount: 0,
      listing: { ...valid.listing, price: 0 },
    })).toThrow("Photo pack");
  });
});
