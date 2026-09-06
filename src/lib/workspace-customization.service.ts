import type { CompanyCapability } from "./company-model";
import { DEFAULT_DASHBOARD_WIDGETS, type DashboardWidgetId } from "./workspace-module-catalog";
import { PERSONAL_WORKSPACE_DEFAULT_HIDDEN } from "./workspace-nav-catalog";
import { whitelabelService } from "./whitelabel.service";
import { organizationService } from "./organization.service";
import { supabase } from "./supabase";

export type WorkspaceCustomizationConfig = {
  hiddenSlugs: string[];
  terminology: Record<string, string>;
  defaultHomeSlug: string | null;
  dashboardWidgets: DashboardWidgetId[];
};

type OrganizationLike = {
  workspace_kind?: string | null;
  default_home_slug?: string | null;
  setup_metadata?: unknown;
  enabled_capabilities?: string[] | null;
};

export function parseWorkspaceCustomization(org: OrganizationLike | null | undefined): WorkspaceCustomizationConfig {
  const meta = (org?.setup_metadata && typeof org.setup_metadata === "object"
    ? org.setup_metadata
    : {}) as Record<string, unknown>;
  const stored = (meta.workspace_customization && typeof meta.workspace_customization === "object"
    ? meta.workspace_customization
    : {}) as Record<string, unknown>;

  const configuredHidden = Array.isArray(stored.hiddenSlugs)
    ? stored.hiddenSlugs.filter((entry): entry is string => typeof entry === "string")
    : [];

  const isPersonal = org?.workspace_kind === "personal";
  const hiddenSlugs =
    configuredHidden.length > 0
      ? configuredHidden
      : isPersonal
        ? [...PERSONAL_WORKSPACE_DEFAULT_HIDDEN]
        : [];

  const terminology: Record<string, string> =
    stored.terminology && typeof stored.terminology === "object" && !Array.isArray(stored.terminology)
      ? Object.fromEntries(
          Object.entries(stored.terminology as Record<string, unknown>)
            .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
            .map(([key, value]) => [key, value as string]),
        )
      : {};

  return {
    hiddenSlugs,
    terminology,
    defaultHomeSlug:
      org?.default_home_slug ??
      (typeof stored.defaultHomeSlug === "string" ? stored.defaultHomeSlug : null),
    dashboardWidgets: Array.isArray(stored.dashboardWidgets)
      ? stored.dashboardWidgets.filter((entry): entry is DashboardWidgetId => typeof entry === "string")
      : [...DEFAULT_DASHBOARD_WIDGETS],
  };
}

export function applyNavCustomization<T extends { slug: string; label: string }>(
  items: T[],
  config: WorkspaceCustomizationConfig,
): T[] {
  return items
    .filter((item) => !config.hiddenSlugs.includes(item.slug))
    .map((item) => ({
      ...item,
      label: config.terminology[item.slug]?.trim() || item.label,
    }));
}

export const workspaceCustomizationService = {
  parseWorkspaceCustomization,
  applyNavCustomization,

  async loadBundle(organizationId: string) {
    const [organization, branding, settings] = await Promise.all([
      organizationService.getOrganizationById(organizationId),
      whitelabelService.getBranding(organizationId),
      whitelabelService.getSettings(organizationId),
    ]);

    return {
      organization,
      branding,
      settings,
      customization: parseWorkspaceCustomization(organization as OrganizationLike),
      enabledCapabilities: ((organization as { enabled_capabilities?: string[] | null }).enabled_capabilities ||
        []) as CompanyCapability[],
    };
  },

  async save(input: {
    organizationId: string;
    hiddenSlugs: string[];
    terminology: Record<string, string>;
    defaultHomeSlug: string | null;
    dashboardWidgets: DashboardWidgetId[];
    enabledCapabilities: CompanyCapability[];
    branding: {
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      custom_domain?: string;
      email_from_address?: string;
      email_reply_to?: string;
    };
    existingSetupMetadata?: unknown;
  }) {
    const meta =
      input.existingSetupMetadata && typeof input.existingSetupMetadata === "object"
        ? { ...(input.existingSetupMetadata as Record<string, unknown>) }
        : {};

    meta.workspace_customization = {
      hiddenSlugs: input.hiddenSlugs,
      terminology: input.terminology,
      defaultHomeSlug: input.defaultHomeSlug,
      dashboardWidgets: input.dashboardWidgets,
      updated_at: new Date().toISOString(),
    };

    const { error: orgError } = await supabase
      .from("organizations")
      .update({
        default_home_slug: input.defaultHomeSlug,
        enabled_capabilities: input.enabledCapabilities,
        setup_metadata: meta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.organizationId);

    if (orgError) throw orgError;

    await whitelabelService.updateBranding(input.organizationId, input.branding);

    return workspaceCustomizationService.loadBundle(input.organizationId);
  },
};
