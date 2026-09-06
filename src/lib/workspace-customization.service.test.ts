import { describe, expect, it } from "vitest";
import {
  applyNavCustomization,
  parseWorkspaceCustomization,
} from "./workspace-customization.service";

describe("workspace-customization.service", () => {
  it("applies personal workspace default hidden slugs", () => {
    const config = parseWorkspaceCustomization({ workspace_kind: "personal", setup_metadata: {} });
    expect(config.hiddenSlugs).toContain("company-launchpad");
  });

  it("respects configured hidden slugs over personal defaults", () => {
    const config = parseWorkspaceCustomization({
      workspace_kind: "personal",
      setup_metadata: { workspace_customization: { hiddenSlugs: ["listings"] } },
    });
    expect(config.hiddenSlugs).toEqual(["listings"]);
  });

  it("applies terminology overrides to nav labels", () => {
    const items = applyNavCustomization(
      [{ slug: "leases", label: "Leases" }],
      { hiddenSlugs: [], terminology: { leases: "Tenancies" }, defaultHomeSlug: null },
    );
    expect(items[0]?.label).toBe("Tenancies");
  });
});
