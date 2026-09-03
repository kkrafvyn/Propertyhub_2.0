import { describe, expect, it } from "vitest";
import {
  buildPropertyComplianceSnapshot,
  resolveEffectiveSubdivision,
  resolvePropertyCountryContext,
} from "./property-country-context.service";
import { resolveCountryContext } from "./country-rules";

describe("property-country-context", () => {
  it("prioritizes property subdivision over address auto-detect", () => {
    const { code, source } = resolveEffectiveSubdivision(
      "NG",
      { country: "Nigeria", region: "Lagos", city: "Lagos", subdivision_code: "FC" },
      "LA"
    );
    expect(code).toBe("FC");
    expect(source).toBe("property");
  });

  it("falls back to address auto-detect when property override absent", () => {
    const { code, source } = resolveEffectiveSubdivision(
      "KE",
      { country: "Kenya", region: "Nairobi", city: "Nairobi" },
      null
    );
    expect(code).toBe("NBI");
    expect(source).toBe("address");
  });

  it("falls back to org subdivision when address unknown", () => {
    const { code, source } = resolveEffectiveSubdivision(
      "US",
      { country: "United States", region: "Unknown", city: "Somewhere" },
      "CA"
    );
    expect(code).toBe("CA");
    expect(source).toBe("organization");
  });

  it("applies Kenya Nairobi county tax patch on property context", () => {
    const ctx = resolvePropertyCountryContext(
      { country: "Kenya", region: "Nairobi", city: "Nairobi", subdivision_code: "NBI" },
      { default_jurisdiction: "KE" }
    );
    const vat = ctx.effectiveTaxProfile.find((t) => t.id === "vat");
    expect(vat?.notes).toContain("Nairobi");
  });

  it("builds compliance snapshot with lease highlights", () => {
    const snapshot = buildPropertyComplianceSnapshot(
      { country: "Ghana", region: "Greater Accra", city: "Accra", subdivision_code: "AA" },
      { default_jurisdiction: "GH" },
      "rental"
    );
    expect(snapshot.subdivisionLabel).toBe("Greater Accra");
    expect(snapshot.leaseHighlights.some((h) => h.includes("deposit"))).toBe(true);
    expect(snapshot.paymentLabel).toContain("PayAngels");
  });

  it("property override beats org for resolvePropertyCountryContext", () => {
    const withProperty = resolvePropertyCountryContext(
      { country: "Nigeria", region: "Lagos", city: "Lagos", subdivision_code: "LA" },
      { default_jurisdiction: "NG", default_subdivision: "FC" }
    );
    expect(withProperty.subdivisionCode).toBe("LA");
    expect(withProperty.pack.leaseRules.maxAdvanceRentMonths).toBe(6);
  });
});

describe("Kenya Mombasa tourism levy", () => {
  it("adds coastal levy notes for short-stay tax profile", () => {
    const ctx = resolveCountryContext({ organizationJurisdiction: "KE", subdivisionCode: "MSA" });
    expect(ctx.effectiveTaxProfile.some((t) => t.id === "tourism_levy")).toBe(true);
  });
});
