import { describe, expect, it } from "vitest";
import { mobileLocationService } from "./mobile-location.service";

describe("mobileLocationService", () => {
  it("calculates and formats nearby property distances", () => {
    const distance = mobileLocationService.distanceKm(
      { latitude: 5.6037, longitude: -0.187 },
      { latitude: 5.6148, longitude: -0.2059 }
    );

    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
    expect(mobileLocationService.formatDistance(distance)).toMatch(/km away/);
  });

  it("sorts listings with coordinates before unknown-distance listings", () => {
    const sorted = mobileLocationService.sortListingsByDistance(
      [
        { id: "far", property: { latitude: 5.8, longitude: -0.3 } },
        { id: "unknown", property: {} },
        { id: "near", property: { latitude: 5.604, longitude: -0.187 } },
      ],
      { latitude: 5.6037, longitude: -0.187 }
    );

    expect(sorted.map((item) => item.id)).toEqual(["near", "far", "unknown"]);
  });
});
