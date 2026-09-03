import { describe, expect, it } from "vitest";
import { analyzeLeaseForProperty } from "./jurisdiction-lease-analyzer.service";

describe("jurisdiction-lease-analyzer", () => {
  it("delegates Ghana leases to Act 220 engine", () => {
    const text = "The Tenant agrees to pay 2 years advance rent upfront.";
    const result = analyzeLeaseForProperty(text, {
      country: "Ghana",
      region: "Greater Accra",
      city: "Accra",
      subdivision_code: "AA",
    });

    expect(result.jurisdictionId).toBe("GH");
    expect(result.violationsCount).toBeGreaterThanOrEqual(1);
    const adv = result.rules.find((r) => r.category === "advance_rent");
    expect(adv?.isCompliant).toBe(false);
  });

  it("flags excessive advance rent in Kenya", () => {
    const text = "Tenant shall pay 18 months advance rent before occupation.";
    const result = analyzeLeaseForProperty(text, {
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      subdivision_code: "NBI",
    });

    expect(result.jurisdictionId).toBe("KE");
    const adv = result.rules.find((r) => r.id === "advance_rent_cap");
    expect(adv?.isCompliant).toBe(false);
  });

  it("reports missing mandatory clauses for UK England", () => {
    const text = "Short let agreement between landlord and tenant for 12 months.";
    const result = analyzeLeaseForProperty(text, {
      country: "United Kingdom",
      region: "England",
      city: "London",
      subdivision_code: "ENG",
    });

    expect(result.jurisdictionId).toBe("GB");
    expect(result.requiredClausesMissing.length).toBeGreaterThan(0);
  });

  it("passes compliant deposit language in California overlay", () => {
    const text = "Security deposit shall not exceed 1 months rent. Tenant enjoys quiet enjoyment.";
    const result = analyzeLeaseForProperty(text, {
      country: "United States",
      region: "California",
      city: "Los Angeles",
      subdivision_code: "CA",
    });

    expect(result.jurisdictionId).toBe("US");
    const dep = result.rules.find((r) => r.id === "deposit_cap");
    expect(dep?.isCompliant).toBe(true);
  });
});
