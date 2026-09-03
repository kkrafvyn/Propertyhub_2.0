import { describe, expect, it } from "vitest";
import { resolveSubdivisionCode, subdivisionLabel } from "./country-rules/subdivision-resolver";
import { resolveCountryContext } from "./country-rules";
import { buildUserMarket, getDisplayCurrencyForMarket } from "./user-market.service";
import { formatMoneyMajor } from "./currency-format";

describe("subdivision-resolver", () => {
  it("maps Lagos city to LA overlay", () => {
    expect(resolveSubdivisionCode("NG", "Lagos", "Lagos")).toBe("LA");
  });

  it("maps London to England", () => {
    expect(resolveSubdivisionCode("GB", "England", "London")).toBe("ENG");
  });

  it("maps Nairobi to NBI", () => {
    expect(resolveSubdivisionCode("KE", "Nairobi", "Nairobi")).toBe("NBI");
  });

  it("returns subdivision label", () => {
    expect(subdivisionLabel("GH", "AA")).toBe("Greater Accra");
  });
});

describe("deepened overlays", () => {
  it("applies Greater Accra rent control", () => {
    const ctx = resolveCountryContext({ organizationJurisdiction: "GH", subdivisionCode: "AA" });
    expect(ctx.pack.leaseRules.rentControlApplies).toBe(true);
    expect(ctx.pack.leaseRules.maxAdvanceRentMonths).toBe(6);
  });

  it("applies Scotland PRT rules", () => {
    const ctx = resolveCountryContext({ organizationJurisdiction: "GB", subdivisionCode: "SCT" });
    expect(ctx.pack.leaseRules.statutoryReferences.some((r) => r.includes("Scotland"))).toBe(true);
  });

  it("applies Gauteng deposit cap", () => {
    const ctx = resolveCountryContext({ organizationJurisdiction: "ZA", subdivisionCode: "GT" });
    expect(ctx.pack.leaseRules.maxSecurityDepositMonths).toBe(1);
  });
});

describe("market currency", () => {
  it("builds Nigeria market with subdivision and NGN", () => {
    const market = buildUserMarket("NG", 0);
    expect(market.subdivisionCode).toBe("LA");
    expect(market.currency).toBe("NGN");
    expect(getDisplayCurrencyForMarket(market)).toBe("NGN");
  });

  it("formats GBP amounts", () => {
    const formatted = formatMoneyMajor(1200, "GBP");
    expect(formatted).toContain("1,200");
  });
});
