import { describe, expect, it } from "vitest";
import {
  getUserDashboardSection,
  getMinimalUserDashboardRoutes,
  getWorkspaceGrowthSection,
  USER_DASHBOARD_ROUTE_CONFIG,
  WORKSPACE_GROWTH_ROUTE_CONFIG,
} from "./section-navigation";

describe("section navigation", () => {
  it("maps new user dashboard feature routes to the correct sections", () => {
    expect(getUserDashboardSection("/app")).toBe("overview");
    expect(getUserDashboardSection("/app/compare")).toBe("compare");
    expect(getUserDashboardSection("/app/buying-tools")).toBe("buying-tools");
    expect(getUserDashboardSection("/app/deals")).toBe("deals");
    expect(getUserDashboardSection("/app/verification")).toBe("verification");
    expect(getUserDashboardSection("/app/insights")).toBe("insights");
    expect(getUserDashboardSection("/app/concierge")).toBe("concierge");
    expect(getUserDashboardSection("/app/groups")).toBe("groups");
    expect(getUserDashboardSection("/app/referrals")).toBe("referrals");
    expect(getUserDashboardSection("/app/support")).toBe("support");
  });

  it("keeps the new user-facing feature links in the dashboard navigation config", () => {
    expect(USER_DASHBOARD_ROUTE_CONFIG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ section: "compare", href: "/app/compare", label: "Compare" }),
        expect.objectContaining({
          section: "buying-tools",
          href: "/app/buying-tools",
          label: "Buyer Tools",
        }),
        expect.objectContaining({ section: "deals", href: "/app/deals", label: "Deal Rooms" }),
        expect.objectContaining({
          section: "verification",
          href: "/app/verification",
          label: "Verification",
        }),
        expect.objectContaining({ section: "insights", href: "/app/insights", label: "Insights" }),
        expect.objectContaining({
          section: "concierge",
          href: "/app/concierge",
          label: "Concierge",
        }),
        expect.objectContaining({
          section: "groups",
          href: "/app/groups",
          label: "Buying Group",
        }),
        expect.objectContaining({
          section: "referrals",
          href: "/app/referrals",
          label: "Referrals",
        }),
        expect.objectContaining({ section: "support", href: "/app/support", label: "Support" }),
      ])
    );
  });

  it("keeps the primary user dashboard compact for the minimal UI", () => {
    expect(getMinimalUserDashboardRoutes().map((route) => route.section)).toEqual([
      "overview",
      "saved",
      "messages",
      "viewings",
      "deals",
      "payments",
      "settings",
    ]);
  });

  it("maps new workspace growth pages to the correct suite sections", () => {
    expect(getWorkspaceGrowthSection("offers")).toBe("offers");
    expect(getWorkspaceGrowthSection("deal-rooms")).toBe("deal-rooms");
    expect(getWorkspaceGrowthSection("performance")).toBe("performance");
    expect(getWorkspaceGrowthSection("seller-portal")).toBe("seller-portal");
    expect(getWorkspaceGrowthSection("crm")).toBe("crm");
    expect(getWorkspaceGrowthSection("referrals")).toBe("referrals");
    expect(getWorkspaceGrowthSection("aftercare")).toBe("aftercare");
    expect(getWorkspaceGrowthSection("finance")).toBeNull();
  });

  it("keeps workspace growth navigation aligned with the shipped sections", () => {
    expect(WORKSPACE_GROWTH_ROUTE_CONFIG).toEqual([
      { slug: "offers", label: "Offers" },
      { slug: "deal-rooms", label: "Deal Rooms" },
      { slug: "performance", label: "Performance" },
      { slug: "seller-portal", label: "Seller Portal" },
      { slug: "crm", label: "Agent CRM" },
      { slug: "referrals", label: "Referrals" },
      { slug: "aftercare", label: "Aftercare" },
    ]);
  });
});
