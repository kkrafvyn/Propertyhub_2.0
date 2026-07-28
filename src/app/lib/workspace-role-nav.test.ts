import { describe, expect, it } from "vitest";
import {
  canAccessWorkspaceSlug,
  filterWorkspaceNavItems,
} from "./workspace-role-nav";

describe("workspace-role-nav", () => {
  it("allows analysts to read listings and finance but not team tools", () => {
    expect(canAccessWorkspaceSlug("listings", "analyst")).toBe(true);
    expect(canAccessWorkspaceSlug("finance", "analyst")).toBe(true);
    expect(canAccessWorkspaceSlug("team", "analyst")).toBe(false);
    expect(canAccessWorkspaceSlug("whitelabel", "analyst")).toBe(false);
  });

  it("allows agents to manage listings and leads", () => {
    expect(canAccessWorkspaceSlug("listings", "agent")).toBe(true);
    expect(canAccessWorkspaceSlug("leads", "agent")).toBe(true);
    expect(canAccessWorkspaceSlug("team", "agent")).toBe(false);
  });

  it("hides blockchain when contracts are not configured", () => {
    expect(canAccessWorkspaceSlug("blockchain", "owner")).toBe(false);
  });

  it("filters nav items for analyst role", () => {
    const items = filterWorkspaceNavItems(
      [
        { slug: "listings", label: "Listings" },
        { slug: "team", label: "Team" },
        { slug: "payments", label: "Payments" },
      ],
      "analyst",
    );

    expect(items.map((item) => item.slug)).toEqual(["listings", "payments"]);
  });
});
