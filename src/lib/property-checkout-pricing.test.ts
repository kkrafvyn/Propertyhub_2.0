import { describe, expect, it } from "vitest";
import {
  computePropertyTaxes,
  taxLinesForPurpose,
} from "./property-checkout-pricing.service";
import { resolvePropertyCountryContext } from "./property-country-context.service";

describe("property-checkout-pricing", () => {
  it("maps rent purpose to rent tax line", () => {
    const lines = taxLinesForPurpose("rent", 100000, 500);
    expect(lines.some((l) => l.category === "rent" && l.amountMinor === 100000)).toBe(true);
    expect(lines.some((l) => l.category === "service_fee")).toBe(true);
  });

  it("calculates Ghana rent withholding on property checkout", () => {
    const { taxMinor, snapshot } = computePropertyTaxes(
      {
        country: "Ghana",
        region: "Greater Accra",
        city: "Accra",
        subdivision_code: "AA",
        currency: "GHS",
      },
      "rent",
      100000,
      0
    );
    expect(snapshot.context.jurisdictionId).toBe("GH");
    expect(taxMinor).toBe(8000);
  });

  it("includes Kenya Nairobi subdivision in tax snapshot", () => {
    const { snapshot } = computePropertyTaxes(
      {
        country: "Kenya",
        region: "Nairobi",
        city: "Nairobi",
        subdivision_code: "NBI",
        currency: "KES",
      },
      "booking_fee",
      50000,
      0
    );
    expect(snapshot.subdivisionLabel).toBe("Nairobi County");
    expect(snapshot.context.jurisdictionId).toBe("KE");
  });
});

describe("South Africa provincial tax", () => {
  it("applies Gauteng VAT patch", () => {
    const ctx = resolvePropertyCountryContext(
      { country: "South Africa", region: "Gauteng", city: "Johannesburg", subdivision_code: "GT" },
      { default_jurisdiction: "ZA" }
    );
    const vat = ctx.effectiveTaxProfile.find((t) => t.id === "vat");
    expect(vat?.notes).toContain("Joburg");
  });
});
