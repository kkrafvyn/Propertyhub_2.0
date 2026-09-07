import { describe, expect, it } from "vitest";
import { mlsIntegrationService } from "./mls-integration.service";
import { propertyTokenService } from "./property-token.service";

describe("integration readiness", () => {
  it("does not expose demo MLS feed builders", () => {
    expect("buildDemoListings" in mlsIntegrationService).toBe(false);
  });

  it("rejects unconfigured token contract addresses", async () => {
    await expect(
      propertyTokenService.getTokenInfo("sim:BMFT-demo", "0xabc"),
    ).rejects.toThrow(/not configured/i);
  });
});
