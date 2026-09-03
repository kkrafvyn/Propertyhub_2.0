import { describe, expect, it } from "vitest";
import {
  GHANA_REGIONS,
  propertyMatchesGhanaRegion,
  GHANA_REGION_ALIASES,
} from "./ghana-regions";

describe("ghana-regions", () => {
  it("defines all 16 administrative regions", () => {
    expect(GHANA_REGIONS).toHaveLength(16);
    expect(new Set(GHANA_REGIONS.map((r) => r.code)).size).toBe(16);
  });

  it("matches properties by region label and city", () => {
    expect(propertyMatchesGhanaRegion("Greater Accra", "Accra", null, "AA")).toBe(true);
    expect(propertyMatchesGhanaRegion("Ashanti", "Kumasi", null, "AS")).toBe(true);
    expect(propertyMatchesGhanaRegion("Northern", "Tamale", null, "AA")).toBe(false);
  });

  it("returns all properties when region filter is all", () => {
    expect(propertyMatchesGhanaRegion("Volta", "Ho", null, "all")).toBe(true);
    expect(propertyMatchesGhanaRegion(null, null, null, undefined)).toBe(true);
  });

  it("exposes resolver aliases for major cities", () => {
    expect(GHANA_REGION_ALIASES.ACCRA).toBe("AA");
    expect(GHANA_REGION_ALIASES.KUMASI).toBe("AS");
    expect(GHANA_REGION_ALIASES.TAMALE).toBe("NR");
  });
});
