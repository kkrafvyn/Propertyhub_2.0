import { describe, expect, it } from "vitest";
import { entitlementsService } from "./entitlements.service";

describe("entitlementsService desktop eligibility", () => {
  it("allows desktop for business plans by default", () => {
    expect(entitlementsService.desktopEnabledFromPlan("business_trial")).toBe(true);
    expect(entitlementsService.desktopEnabledFromPlan("business")).toBe(true);
    expect(entitlementsService.desktopEnabledFromPlan("enterprise")).toBe(true);
  });

  it("blocks desktop for personal plan", () => {
    expect(entitlementsService.desktopEnabledFromPlan("personal")).toBe(false);
  });

  it("respects explicit limits override", () => {
    expect(
      entitlementsService.desktopEnabledFromPlan("business", { desktop_enabled: false }),
    ).toBe(false);
    expect(
      entitlementsService.desktopEnabledFromPlan("personal", { desktop_enabled: true }),
    ).toBe(true);
  });

  it("canUseDesktop reads organization profile entitlements", () => {
    expect(
      entitlementsService.canUseDesktop({
        organizationId: "org-1",
        workspaceKind: "personal",
        customerType: "personal",
        businessTypes: [],
        enabledCapabilities: [],
        enabledModules: [],
        customization: {
          hiddenSlugs: [],
          terminology: {},
          defaultHomeSlug: null,
          dashboardWidgets: [],
        },
        entitlements: {
          planCode: "personal",
          status: "active",
          limits: {},
          desktopEnabled: false,
          aiRequestsMonthly: 50,
          maxUsers: 3,
          maxProperties: 25,
        },
      }),
    ).toBe(false);
  });
});
