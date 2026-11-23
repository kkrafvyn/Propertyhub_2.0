import { saasControlPlaneService } from "./saas-control-plane.service";
import { organizationService } from "./organization.service";
import { loadOrganizationProfile } from "./organization-profile.service";
import type { OrganizationProfile } from "./organization-profile.service";

export type SaasPlanCode = "personal" | "business_trial" | "business" | "enterprise";

export type DesktopEligibilityResult = {
  eligible: boolean;
  reason?: "no_organization" | "plan_restricted" | "suspended" | "verification_unavailable";
  planCode?: string;
  planLabel?: string;
  organizationId?: string;
  organizationName?: string;
};

export const SAAS_PLAN_DEFINITIONS: Record<
  SaasPlanCode,
  {
    label: string;
    desktopEnabled: boolean;
    aiRequestsMonthly: number;
    maxUsers: number;
    maxProperties: number;
    modules: "core" | "standard" | "full";
  }
> = {
  personal: {
    label: "Personal",
    desktopEnabled: false,
    aiRequestsMonthly: 50,
    maxUsers: 3,
    maxProperties: 25,
    modules: "core",
  },
  business_trial: {
    label: "Business Trial",
    desktopEnabled: true,
    aiRequestsMonthly: 500,
    maxUsers: 25,
    maxProperties: 500,
    modules: "standard",
  },
  business: {
    label: "Business",
    desktopEnabled: true,
    aiRequestsMonthly: 2000,
    maxUsers: 100,
    maxProperties: 5000,
    modules: "standard",
  },
  enterprise: {
    label: "Enterprise",
    desktopEnabled: true,
    aiRequestsMonthly: 10000,
    maxUsers: 9999,
    maxProperties: 999999,
    modules: "full",
  },
};

export const entitlementsService = {
  async assertOperational(organizationId: string) {
    return saasControlPlaneService.assertOperational(organizationId);
  },

  desktopEnabledFromPlan(planCode: string, limits?: Record<string, unknown> | null) {
    if (limits && typeof limits.desktop_enabled === "boolean") {
      return limits.desktop_enabled;
    }
    return SAAS_PLAN_DEFINITIONS[planCode as SaasPlanCode]?.desktopEnabled ?? false;
  },

  canUseDesktop(profile: OrganizationProfile | null | undefined) {
    // Unknown/missing entitlements never grant desktop capabilities.
    return profile?.entitlements?.desktopEnabled === true;
  },

  async resolveUserDesktopEligibility(userId: string): Promise<DesktopEligibilityResult> {
    const memberships = await organizationService.getUserOrganizations(userId);
    if (!memberships?.length) {
      return {
        eligible: false,
        reason: "no_organization",
      };
    }

    for (const membership of memberships) {
      const organization = Array.isArray(membership.organization)
        ? membership.organization[0]
        : membership.organization;
      if (!organization?.id) continue;

      try {
        await saasControlPlaneService.assertOperational(organization.id);
      } catch {
        return {
          eligible: false,
          reason: "suspended",
          organizationId: organization.id,
          organizationName: organization.name,
        };
      }

      const profile = await loadOrganizationProfile(organization);
      if (this.canUseDesktop(profile)) {
        return {
          eligible: true,
          organizationId: organization.id,
          organizationName: organization.name,
          planCode: profile.entitlements?.planCode,
          planLabel: this.planLabel(profile.entitlements?.planCode || "business_trial"),
        };
      }
    }

    const fallbackOrg = Array.isArray(memberships[0]?.organization)
      ? memberships[0]?.organization[0]
      : memberships[0]?.organization;
    const fallbackProfile = fallbackOrg
      ? await loadOrganizationProfile(fallbackOrg)
      : null;

    return {
      eligible: false,
      reason: "plan_restricted",
      organizationId: fallbackOrg?.id,
      organizationName: fallbackOrg?.name,
      planCode: fallbackProfile?.entitlements?.planCode || "personal",
      planLabel: this.planLabel(fallbackProfile?.entitlements?.planCode || "personal"),
    };
  },

  canEnableModule(profile: OrganizationProfile | null | undefined, moduleSlug: string) {
    if (!profile?.enabledModules?.length) return true;
    return profile.enabledModules.includes(moduleSlug);
  },

  async trackAiUsage(organizationId: string, quantity = 1) {
    return saasControlPlaneService.incrementUsage(organizationId, "ai_requests", quantity);
  },

  planLabel(planCode: string) {
    return SAAS_PLAN_DEFINITIONS[planCode as SaasPlanCode]?.label || planCode;
  },
};
