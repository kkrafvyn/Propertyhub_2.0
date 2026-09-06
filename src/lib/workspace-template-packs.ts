import type { CompanyBusinessType, CompanyCapability } from "./company-model";
import type { DashboardWidgetId } from "./workspace-module-catalog";

export type CustomerType =
  | "personal"
  | "agency"
  | "property_manager"
  | "developer"
  | "enterprise";

export type WorkspaceTemplatePack = {
  id: CustomerType;
  label: string;
  description: string;
  businessTypes: CompanyBusinessType[];
  enabledModules: string[];
  hiddenNavSlugs: string[];
  dashboardWidgets: DashboardWidgetId[];
  defaultHomeSlug: string;
  workflowPresets: string[];
  suggestedRoles: string[];
};

export const WORKSPACE_TEMPLATE_PACKS: WorkspaceTemplatePack[] = [
  {
    id: "personal",
    label: "Personal Property Workspace",
    description: "Individual owners managing their own properties.",
    businessTypes: ["property_owner"],
    enabledModules: ["properties", "sales", "leasing", "maintenance", "accounting"],
    hiddenNavSlugs: [
      "company-launchpad",
      "team-collaboration",
      "workflows",
      "enterprise-operations",
      "command-center",
    ],
    dashboardWidgets: ["listings", "viewings", "revenue", "quick_actions"],
    defaultHomeSlug: "",
    workflowPresets: ["leasing", "maintenance"],
    suggestedRoles: ["owner"],
  },
  {
    id: "agency",
    label: "Sales Agency Workspace",
    description: "Listings, leads, CRM, viewings, and deal pipeline.",
    businessTypes: ["agency_brokerage"],
    enabledModules: ["sales", "crm", "leasing", "communications", "analytics"],
    hiddenNavSlugs: ["enterprise-operations", "data-migration"],
    dashboardWidgets: ["pipeline", "listings", "viewings", "team", "quick_actions"],
    defaultHomeSlug: "leads",
    workflowPresets: ["sales", "leasing"],
    suggestedRoles: ["sales_manager", "agent"],
  },
  {
    id: "property_manager",
    label: "Property Management Workspace",
    description: "Units, tenants, leases, maintenance, and finance.",
    businessTypes: ["property_management", "facility_management"],
    enabledModules: [
      "properties",
      "leasing",
      "maintenance",
      "inspections",
      "utilities",
      "collections",
      "accounting",
    ],
    hiddenNavSlugs: ["market-intelligence"],
    dashboardWidgets: ["listings", "viewings", "revenue", "compliance", "quick_actions"],
    defaultHomeSlug: "estate-operations",
    workflowPresets: ["leasing", "maintenance", "collections"],
    suggestedRoles: ["property_manager", "facilities_manager"],
  },
  {
    id: "developer",
    label: "Development Workspace",
    description: "Projects, handover, snagging, and unit sales.",
    businessTypes: ["developer", "construction_services"],
    enabledModules: ["properties", "sales", "leasing", "procurement", "analytics"],
    hiddenNavSlugs: ["collections-cases"],
    dashboardWidgets: ["pipeline", "listings", "revenue", "recent_activity", "quick_actions"],
    defaultHomeSlug: "listings",
    workflowPresets: ["sales", "maintenance"],
    suggestedRoles: ["developer", "sales_manager"],
  },
  {
    id: "enterprise",
    label: "Enterprise Workspace",
    description: "Multi-unit operations with finance, procurement, and approvals.",
    businessTypes: ["investment_portfolio", "hybrid"],
    enabledModules: [
      "properties",
      "users",
      "sales",
      "crm",
      "leasing",
      "maintenance",
      "accounting",
      "collections",
      "procurement",
      "ai",
      "analytics",
      "integrations",
    ],
    hiddenNavSlugs: [],
    dashboardWidgets: [
      "pipeline",
      "revenue",
      "listings",
      "viewings",
      "team",
      "compliance",
      "ai_briefing",
      "quick_actions",
    ],
    defaultHomeSlug: "",
    workflowPresets: ["leasing", "maintenance", "collections", "sales"],
    suggestedRoles: ["owner", "managing_director", "finance_manager"],
  },
];

export function resolveTemplatePack(input: {
  workspaceKind?: string | null;
  businessTypes?: string[] | null;
}): WorkspaceTemplatePack {
  if (input.workspaceKind === "personal") {
    return WORKSPACE_TEMPLATE_PACKS.find((pack) => pack.id === "personal")!;
  }

  const types = input.businessTypes || [];
  if (types.includes("agency_brokerage")) {
    return WORKSPACE_TEMPLATE_PACKS.find((pack) => pack.id === "agency")!;
  }
  if (types.includes("developer") || types.includes("construction_services")) {
    return WORKSPACE_TEMPLATE_PACKS.find((pack) => pack.id === "developer")!;
  }
  if (
    types.includes("investment_portfolio") ||
    types.includes("hybrid")
  ) {
    return WORKSPACE_TEMPLATE_PACKS.find((pack) => pack.id === "enterprise")!;
  }
  return WORKSPACE_TEMPLATE_PACKS.find((pack) => pack.id === "property_manager")!;
}

export function buildTemplateCustomization(pack: WorkspaceTemplatePack) {
  return {
    hiddenSlugs: pack.hiddenNavSlugs,
    terminology: {},
    defaultHomeSlug: pack.defaultHomeSlug,
    dashboardWidgets: pack.dashboardWidgets,
    template_pack: pack.id,
    workflow_templates: pack.workflowPresets,
    suggested_roles: pack.suggestedRoles,
  };
}
