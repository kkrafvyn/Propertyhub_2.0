import { describe, expect, it } from "vitest";
import {
  buildListingProviderRequest,
  getListingProviderConfig,
  normalizeListingFeed,
} from "./listing-syndication";

describe("listing syndication", () => {
  it("supports MLS providers that issue only an API key", () => {
    const env: Record<string, string> = {
      MLS_API_KEY: "key-only",
      MLS_FEED_URL: "https://feed.example.test/listings",
    };
    const config = getListingProviderConfig("mls", (name) => env[name]);
    expect(config).toMatchObject({ authMode: "x-api-key", keyHeader: "X-API-Key" });
    expect(buildListingProviderRequest(config!).headers).toEqual({
      Accept: "application/json",
      "X-API-Key": "key-only",
    });
  });

  it("maps RESO-style rows and ignores rows without stable identifiers", () => {
    const rows = normalizeListingFeed({ value: [
      { ListingKey: "A-1", UnparsedAddress: "1 Main St", ListPrice: 250000, BedroomsTotal: 3 },
      { ListPrice: 99 },
    ] }, "mls");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ external_id: "A-1", address: "1 Main St", price: 250000, bedrooms: 3 });
  });

  it("maps the configured listing actor schema", () => {
    const rows = normalizeListingFeed([{
      source: { localId: "listing-42", url: "https://example.test/listing/42" },
      address: { formattedAddress: "42 Palm Street", city: "Accra", state: "Greater Accra" },
      price: { value: 1200000, currency: "GHS" },
      gps: { lat: 5.6, lng: -0.2 },
      pictures: ["https://images.example.test/42.jpg"],
      livingArea: 100,
      areaUnit: "sqm",
      bedrooms: 3,
    }], "mls");
    expect(rows[0]).toMatchObject({
      external_id: "listing-42",
      address: "42 Palm Street",
      price: 1200000,
      currency: "GHS",
      latitude: 5.6,
      longitude: -0.2,
      square_feet: 1076,
      images: ["https://images.example.test/42.jpg"],
    });
  });

  it("never sends the key when provider configuration is incomplete", () => {
    expect(getListingProviderConfig("mls", (name) => name === "MLS_API_KEY" ? "key" : undefined)).toBeNull();
  });
});
