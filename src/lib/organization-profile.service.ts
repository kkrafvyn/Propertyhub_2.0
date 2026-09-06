import type { CompanyCapability } from "./company-model";
import { parseWorkspaceCustomization } from "./workspace-customization.service";
import { resolveTemplatePack } from "./workspace-template-packs";
import { saasControlPlaneService } from "./saas-control-plane.service";

export type OrganizationProfile = {
  organizationId: string;
  workspaceKind: "personal" | "company";
  customerType: string;
  businessTypes: string[];
  enabledCapabilities: CompanyCapability[];
  enabledModules: string[];
  customization: ReturnType<typeof parseWorkspaceCustomization>;
  entitlements: {
    planCode: string;
    status: string;
    limits: Record<string, unknown>;
    desktopEnabled: boolean;
    aiRequestsMonthly: number;
    maxUsers: number;
    maxProperties: number;
  } | null;
};

type OrganizationRow = {
  id: string;
  workspace_kind?: string | null;
  business_types?: string[] | null;
  enabled_capabilities?: string[] | null;
  enabled_workspace_modules?: string[] | null;
  default_home_slug?: string | null;
  setup_metadata?: unknown;
};

function readLimits(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export async function loadOrganizationProfile(
  organization: OrganizationRow,
): Promise<OrganizationProfile> {
  const workspaceKind =
    organization.workspace_kind === "personal" ? "personal" : "company";
  const businessTypes = (organization.business_types || []) as string[];
  const pack = resolveTemplatePack({ workspaceKind, businessTypes });
  const customization = parseWorkspaceCustomization(organization);

  let entitlements: OrganizationProfile["entitlements"] = null;
  try {
    const row = await saasControlPlaneService.getEntitlement(organization.id);
    if (row) {
      const limits = readLimits(row.limits);
      entitlements = {
        planCode: row.plan_code,
        status: row.status,
        limits,
        desktopEnabled:
          typeof limits.desktop_enabled === "boolean"
            ? limits.desktop_enabled
            : row.plan_code !== "personal",
        aiRequestsMonthly: Number(limits.ai_requests_monthly ?? 500),
        maxUsers: Number(limits.max_users ?? 25),
        maxProperties: Number(limits.max_properties ?? 500),
      };
    }
  } catch {
    entitlements = null;
  }

  const enabledModules =
    (organization.enabled_workspace_modules?.length
      ? organization.enabled_workspace_modules
      : pack.enabledModules) || [];

  return {
    organizationId: organization.id,
    workspaceKind,
    customerType: pack.id,
    businessTypes,
    enabledCapabilities: (organization.enabled_capabilities || []) as CompanyCapability[],
    enabledModules,
    customization,
    entitlements,
  };
}

export function isModuleEnabledForProfile(
  profile: OrganizationProfile,
  moduleSlug: string,
): boolean {
  if (!profile.enabledModules.length) return true;
  return profile.enabledModules.includes(moduleSlug);
}
