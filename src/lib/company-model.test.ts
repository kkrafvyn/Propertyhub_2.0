import { describe, expect, it } from "vitest";
import {
  resolveCapabilitiesFromBusinessTypes,
  getRecommendedDepartments,
  isSlugEnabledForCapabilities,
  getRoleHomeSlug,
} from "./company-model";

describe("company model", () => {
  it("resolves hybrid capabilities from multiple business types", () => {
    const capabilities = resolveCapabilitiesFromBusinessTypes([
      "agency_brokerage",
      "property_management",
    ]);
    expect(capabilities).toContain("sales");
    expect(capabilities).toContain("management");
    expect(capabilities).toContain("leasing");
  });

  it("recommends departments from capabilities", () => {
    const departments = getRecommendedDepartments(["sales", "management"]);
    expect(departments.some((department) => department.key === "sales")).toBe(true);
    expect(departments.some((department) => department.key === "finance")).toBe(true);
  });

  it("filters workspace modules by enabled capabilities", () => {
    expect(isSlugEnabledForCapabilities("leads", ["sales"])).toBe(true);
    expect(isSlugEnabledForCapabilities("maintenance", ["sales"])).toBe(false);
    expect(isSlugEnabledForCapabilities("team", ["sales"])).toBe(true);
  });

  it("maps roles to department home pages", () => {
    expect(getRoleHomeSlug("finance_manager")).toBe("estate-finance");
    expect(getRoleHomeSlug("agent")).toBe("leads");
    expect(getRoleHomeSlug("technician")).toBe("maintenance");
  });
});
