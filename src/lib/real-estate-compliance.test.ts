import { describe, expect, it } from "vitest";
import {
  getListingComplianceChecklist,
  resolveJurisdiction,
  validateListingCompliance,
} from "./real-estate-compliance";

describe("real-estate-compliance", () => {
  it("resolves Ghana from country and region", () => {
    expect(resolveJurisdiction({ country: "GH" })).toBe("GH");
    expect(resolveJurisdiction({ region: "Greater Accra", country: "Ghana" })).toBe("GH");
    expect(resolveJurisdiction({ city: "Lagos", country: "Nigeria" })).toBe("NG");
    expect(resolveJurisdiction({ city: "London", country: "UK" })).toBe("GB");
  });

  it("returns listing checklist with type-specific rules", () => {
    const rental = getListingComplianceChecklist("GH", "rental");
    const sale = getListingComplianceChecklist("GH", "sale");
    expect(rental.requiredDisclosures.length).toBeGreaterThan(sale.requiredDisclosures.length - 1);
    expect(rental.requiresKyc).toBe(true);
  });

  it("validates publish confirmations", () => {
    const invalid = validateListingCompliance({
      jurisdictionId: "US",
      listingType: "sale",
      confirmations: { authority_confirmed: true },
    });
    expect(invalid.valid).toBe(false);

    const valid = validateListingCompliance({
      jurisdictionId: "US",
      listingType: "sale",
      confirmations: {
        authority_confirmed: true,
        disclosures_accurate: true,
        agency_licensed: true,
        fair_housing: true,
        kyc_ready: true,
      },
    });
    expect(valid.valid).toBe(true);
  });
});
