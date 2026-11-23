import { describe, expect, it } from "vitest";
import { mapListingToCard, mapListingToMapListing } from "./listing-mappers";

const makeListing = (latitude: number | null, longitude: number | null) => ({
  id: "test-listing-1",
  listing_type: "rental",
  currency: "GHS",
  price: 3200,
  status: "listed",
  visibility: "public",
  organization: { verified: false },
  property: {
    address: "East Legon home",
    category: "house",
    country: "Ghana",
    region: "Greater Accra",
    city: "Accra",
    latitude,
    longitude,
    amenities: [],
    media: [],
  },
});

describe("consumer listing mapping", () => {
  it("does not fabricate a map location for missing coordinates", () => {
    const listing = mapListingToMapListing(makeListing(null, null));
    expect(listing.lat).toBeNull();
    expect(listing.lng).toBeNull();
    expect(listing.locationNote).toMatch(/not provided/i);
  });

  it("preserves genuine zero coordinates and rejects out-of-range coordinates", () => {
    const accurate = mapListingToMapListing(makeListing(0, 0));
    expect(accurate.lat).toBe(0);
    expect(accurate.lng).toBe(0);
    const invalid = mapListingToMapListing(makeListing(180, 310));
    expect(invalid.lat).toBeNull();
    expect(invalid.lng).toBeNull();
  });

  it("displays a 3D badge only for a genuine supported tour link", () => {
    const listing = makeListing(null, null);
    expect(mapListingToCard(listing).has3DTour).toBe(false);
    expect(mapListingToCard({
      ...listing,
      property: { ...listing.property, virtual_tour_url: "https://my.matterport.com/show/?m=AbCdEf12345" },
    }).has3DTour).toBe(true);
  });
});
