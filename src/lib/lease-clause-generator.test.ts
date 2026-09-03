import { describe, expect, it } from "vitest";
import { generateLeaseSchedule } from "./lease-clause-generator.service";

describe("lease-clause-generator", () => {
  it("generates Ghana schedule with PayAngels payment line", () => {
    const schedule = generateLeaseSchedule({
      property: {
        country: "Ghana",
        region: "Greater Accra",
        city: "Accra",
        subdivision_code: "AA",
        address: "12 Independence Ave",
      },
      landlordName: "Kofi Owusu",
      tenantName: "Ama Ampomah",
      rentAmountMajor: 4500,
      currency: "GHS",
    });

    expect(schedule.jurisdictionLabel).toContain("Ghana");
    expect(schedule.subdivisionLabel).toBe("Greater Accra");
    expect(schedule.paymentRail).toMatch(/PayAngels/i);
    expect(schedule.markdown).toContain("PayAngels");
    expect(schedule.mandatoryClauses.length).toBeGreaterThan(0);
    expect(schedule.warnings.some((w) => w.includes("Advance rent"))).toBe(true);
  });

  it("includes Kenya Nairobi subdivision caps", () => {
    const schedule = generateLeaseSchedule({
      property: {
        country: "Kenya",
        region: "Nairobi",
        city: "Nairobi",
        subdivision_code: "NBI",
      },
      currency: "KES",
    });

    expect(schedule.subdivisionLabel).toBe("Nairobi County");
    expect(schedule.addendumTitle).toContain("Nairobi");
    expect(schedule.addendumClauses.length).toBeGreaterThan(0);
  });

  it("downloads markdown via blob helper without throwing", () => {
    const schedule = generateLeaseSchedule({
      property: { country: "Nigeria", city: "Lagos", subdivision_code: "LA" },
    });
    expect(schedule.plainText).not.toContain("**");
  });
});
