import { describe, expect, it } from "vitest";
import {
  calculateCountryTaxes,
  getCountryPack,
  listCountryPacks,
  resolveCountryContext,
  validateAddressForCountry,
  SUBDIVISION_OPTIONS,
} from "./country-rules";

describe("country-rules", () => {
  it("lists 11 active market packs plus global", () => {
    const packs = listCountryPacks();
    expect(packs.length).toBe(11);
    expect(packs.some((p) => p.jurisdictionId === "GH")).toBe(true);
    expect(packs.some((p) => p.jurisdictionId === "US")).toBe(true);
  });

  it("resolves Ghana context with GHS and MoMo rails", () => {
    const ctx = resolveCountryContext({ country: "Ghana" });
    expect(ctx.jurisdictionId).toBe("GH");
    expect(ctx.currency).toBe("GHS");
    expect(ctx.pack.paymentRails.some((r) => r.id === "momo_mtn")).toBe(true);
  });

  it("applies US state overlay for California", () => {
    const ctx = resolveCountryContext({ country: "US", subdivisionCode: "CA" });
    expect(ctx.pack.leaseRules.rentControlApplies).toBe(true);
    expect(ctx.pack.leaseRules.maxSecurityDepositMonths).toBe(2);
    expect(ctx.effectiveTaxProfile.some((t) => t.id === "state_sales_tax" && t.rateBasisPoints === 725)).toBe(true);
  });

  it("applies Nigeria Lagos overlay with stricter advance rent", () => {
    const ctx = resolveCountryContext({ country: "NG", subdivisionCode: "LA" });
    expect(ctx.pack.leaseRules.maxAdvanceRentMonths).toBe(6);
    expect(ctx.pack.leaseRules.statutoryReferences.some((r) => r.includes("Lagos"))).toBe(true);
  });

  it("applies Ontario provincial HST tax patch", () => {
    const ctx = resolveCountryContext({ country: "CA", subdivisionCode: "ON" });
    const gst = ctx.effectiveTaxProfile.find((t) => t.id === "gst");
    expect(gst?.rateBasisPoints).toBe(1300);
    expect(gst?.label).toContain("HST");
  });

  it("applies Dubai emirate Ejari lease rules", () => {
    const ctx = resolveCountryContext({ country: "AE", subdivisionCode: "DXB" });
    expect(ctx.pack.leaseRules.requiredLeaseClauses.some((c) => c.includes("Ejari"))).toBe(true);
  });

  it("lists subdivision options for all overlay-enabled markets", () => {
    expect(SUBDIVISION_OPTIONS.US?.length).toBeGreaterThanOrEqual(16);
    expect(SUBDIVISION_OPTIONS.NG?.length).toBeGreaterThanOrEqual(5);
    expect(SUBDIVISION_OPTIONS.EU?.length).toBeGreaterThanOrEqual(8);
  });

  it("calculates Ghana rent withholding tax", () => {
    const ctx = resolveCountryContext({ country: "GH" });
    const result = calculateCountryTaxes(ctx, [{ category: "rent", amountMinor: 100000 }]);
    expect(result.totalTaxMinor).toBe(8000);
  });

  it("validates GhanaPostGPS format", () => {
    const ctx = resolveCountryContext({ country: "GH" });
    expect(validateAddressForCountry(ctx, { address: "1 Main", city: "Accra", region: "GA", ghana_post_gps: "GA-123-4567" })).toBeNull();
    expect(validateAddressForCountry(ctx, { address: "1 Main", city: "Accra", region: "GA", ghana_post_gps: "bad" })).toContain("GhanaPostGPS");
  });

  it("returns US enabled modules for Buildium parity", () => {
    const pack = getCountryPack("US");
    expect(pack.enabledModules).toContain("1099-reporting");
    expect(pack.enabledModules).toContain("trust-accounting");
  });

  it("uses PayAngels as primary rail in every market including US and UK", () => {
    for (const id of ["GH", "NG", "US", "GB", "EU", "IN", "GLOBAL"] as const) {
      const pack = getCountryPack(id);
      expect(pack.paymentRails[0]?.id).toBe("payangels");
    }
  });
});
