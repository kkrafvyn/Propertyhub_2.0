import { describe, expect, it } from "vitest";
import { mlsIntegrationService } from "./mls-integration.service";
import { propertyTokenService } from "./property-token.service";

describe("gap closure fallbacks", () => {
  it("builds demo MLS listings for each provider", () => {
    for (const provider of ["mls", "zillow", "realtor"] as const) {
      const listings = mlsIntegrationService.buildDemoListings(provider);
      expect(listings.length).toBeGreaterThanOrEqual(3);
      expect(listings[0].provider).toBe(provider);
      expect(listings[0].title.length).toBeGreaterThan(0);
    }
  });

  it("returns simulated token info for sim contract addresses", async () => {
    const info = await propertyTokenService.getTokenInfo("sim:BMFT-demo", "0xabc");
    expect(info.symbol).toBe("BMFT");
    expect(info.balance).toBe("100");
  });
});
