import { afterEach, describe, expect, it, vi } from "vitest";
import { organizationService } from "./organization.service";
import { entitlementsService } from "./entitlements.service";

describe("entitlementsService desktop eligibility", () => {
  afterEach(() => vi.restoreAllMocks());
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
  it("does not grant desktop access to accounts without a reviewed workspace", async () => {
    vi.spyOn(organizationService, "getUserOrganizations").mockResolvedValue([]);
    await expect(entitlementsService.resolveUserDesktopEligibility("new-consumer")).resolves.toMatchObject({
      eligible: false,
      reason: "no_organization",
    });
  });

  it("denies unknown plans and missing entitlements by default", () => {
    expect(entitlementsService.desktopEnabledFromPlan("unrecognized-plan")).toBe(false);
    expect(entitlementsService.canUseDesktop(null)).toBe(false);
    expect(entitlementsService.canUseDesktop({} as never)).toBe(false);
  });

});
