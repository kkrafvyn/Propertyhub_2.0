import { describe, expect, it } from "vitest";
import { isScreeningCheckAvailable } from "./tenant-screening-providers";

describe("tenant screening availability", () => {
  it("marks bureau checks unavailable when TransUnion is not configured", () => {
    expect(isScreeningCheckAvailable("credit")).toBe(false);
    expect(isScreeningCheckAvailable("criminal")).toBe(false);
    expect(isScreeningCheckAvailable("eviction")).toBe(false);
  });

  it("allows identity checks via manual trust path", () => {
    expect(isScreeningCheckAvailable("identity")).toBe(true);
  });
});

describe("runSelectedScreeningChecks", () => {
  it("rejects empty selection", async () => {
    const { leaseScreeningService } = await import("./lease-screening.service");
    await expect(
      leaseScreeningService.runSelectedScreeningChecks({
        organizationId: "org-1",
        applicantName: "Test User",
        applicantEmail: "test@example.com",
        checkTypes: [],
      }),
    ).rejects.toThrow(/at least one/i);
  });

  it("rejects unavailable bureau checks", async () => {
    const { leaseScreeningService } = await import("./lease-screening.service");
    await expect(
      leaseScreeningService.runSelectedScreeningChecks({
        organizationId: "org-1",
        applicantName: "Test User",
        applicantEmail: "test@example.com",
        checkTypes: ["credit"],
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it("blocks screening when property jurisdiction is not production-ready", async () => {
    const { leaseScreeningService } = await import("./lease-screening.service");
    await expect(
      leaseScreeningService.runSelectedScreeningChecks({
        organizationId: "org-1",
        applicantName: "Test User",
        applicantEmail: "test@example.com",
        propertyCountry: "United States",
        propertyRegion: "California",
        checkTypes: ["identity"],
      }),
    ).rejects.toThrow(/tenant screening is not enabled/i);
  });
});
