import { describe, expect, it } from "vitest";
import { canAccessWorkspaceSlug, filterWorkspaceNavItems } from "../app/lib/workspace-role-nav";

describe("workspace role nav", () => {
  it("respects custom permissions for restricted roles", () => {
    expect(canAccessWorkspaceSlug("payments", "analyst", null)).toBe(true);
    expect(canAccessWorkspaceSlug("team", "analyst", null)).toBe(false);
    expect(canAccessWorkspaceSlug("team", "analyst", ["team:manage"])).toBe(true);
  });

  it("hides modules outside enabled company capabilities", () => {
    expect(canAccessWorkspaceSlug("leads", "agent", null, ["sales"])).toBe(true);
    expect(canAccessWorkspaceSlug("maintenance", "agent", null, ["sales"])).toBe(false);
  });

  it("filters nav items by role and capabilities together", () => {
    const items = filterWorkspaceNavItems(
      [
        { slug: "leads", label: "Leads" },
        { slug: "maintenance", label: "Maintenance" },
        { slug: "team", label: "Team" },
      ],
      "agent",
      null,
      ["sales"],
    );
    expect(items.map((item) => item.slug)).toEqual(["leads"]);
  });
});
