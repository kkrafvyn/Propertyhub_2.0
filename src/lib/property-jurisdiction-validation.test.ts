import { describe, expect, it } from "vitest";
import { validatePropertyLocationForPublish } from "./property-jurisdiction-validation";

describe("property-jurisdiction-validation", () => {
  it("requires region and subdivision before publish", () => {
    const result = validatePropertyLocationForPublish({
      country: "Ghana",
      city: "Accra",
      region: "",
      address: "1 Test St",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Region"))).toBe(true);
  });

  it("passes for Ghana property with known region", () => {
    const result = validatePropertyLocationForPublish({
      country: "Ghana",
      city: "Accra",
      region: "Greater Accra",
      address: "1 Test St",
    });
    expect(result.valid).toBe(true);
  });

  it("blocks publish in counsel-review jurisdictions", () => {
    const result = validatePropertyLocationForPublish({
      country: "United States",
      city: "Los Angeles",
      region: "California",
      address: "1 Test St",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("not enabled"))).toBe(true);
  });
});
