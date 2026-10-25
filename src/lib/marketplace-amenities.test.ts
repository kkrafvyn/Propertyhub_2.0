import { describe, expect, it } from "vitest";
import { matchesMarketplaceAmenities } from "./marketplace-amenities";
describe("marketplace amenity filtering", () => {
  it("requires every requested feature and normalises recorded labels", () => {
    expect(matchesMarketplaceAmenities([" Parking ", "FURNISHED"], ["parking", "furnished"])).toBe(true);
    expect(matchesMarketplaceAmenities(["parking"], ["parking", "pets allowed"])).toBe(false);
  });
  it("does not infer features from missing or malformed data", () => {
    for (const value of [null, undefined, {}, "parking", [null, 1, "no parking"]]) expect(matchesMarketplaceAmenities(value, ["parking"])).toBe(false);
    expect(matchesMarketplaceAmenities(null, [])).toBe(true);
  });
});
