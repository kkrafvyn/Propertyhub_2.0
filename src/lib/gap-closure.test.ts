import { describe, expect, it } from "vitest";
import { mlsIntegrationService } from "./mls-integration.service";
import { propertyTokenService } from "./property-token.service";

describe("integration readiness", () => {
  it("builds preview MLS listings for integration hub docs", () => {
    for (const provider of ["mls", "zillow", "realtor"] as const) {
      const listings = mlsIntegrationService.buildDemoListings(provider);
      expect(listings.length).toBeGreaterThanOrEqual(3);
      expect(listings[0].provider).toBe(provider);
      expect(listings[0].title.length).toBeGreaterThan(0);
    }
  });

  it("rejects unconfigured token contract addresses", async () => {
    await expect(
      propertyTokenService.getTokenInfo("sim:BMFT-demo", "0xabc"),
    ).rejects.toThrow(/not configured/i);
  });
});
