import { describe, expect, it } from "vitest";
import {
  canAccessWorkspaceSlug,
  filterWorkspaceNavItems,
  WORKSPACE_SLUG_PERMISSIONS,
} from "./workspace-role-nav";

/** Nav slugs that must be routable (see WorkspaceLayout CORE_NAV_ITEMS). */
const ROUTED_WORKSPACE_SLUGS = [
  "tenant-screening",
  "hoa-management",
  "cam-billing",
  "contractor-1099",
  "trust-accounting",
  "commercial-escalations",
  "integration-marketplace",
  "international-rules",
] as const;

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

  it("shows blockchain setup and transactions to authorized owners before deployment", () => {
    expect(canAccessWorkspaceSlug("blockchain", "owner")).toBe(true);
  });

  it("filters nav items for analyst role", () => {
    const items = filterWorkspaceNavItems(
      [
        { slug: "listings", label: "Listings" },
        { slug: "team", label: "Team" },
        { slug: "payments", label: "Payments" },
        { slug: "contacts", label: "Contacts" },
        { slug: "tasks", label: "Tasks" },
      ],
      "analyst",
    );

    expect(items.map((item) => item.slug)).toEqual(["listings", "payments", "contacts", "tasks"]);
  });

  it("includes permissions for all enterprise nav slugs", () => {
    for (const slug of ROUTED_WORKSPACE_SLUGS) {
      expect(WORKSPACE_SLUG_PERMISSIONS[slug], slug).toBeDefined();
    }
  });
});
