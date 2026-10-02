export type WorkspaceModuleCategory = "core" | "operations" | "commercial" | "finance" | "advanced";

export type WorkspaceModuleCatalogItem = {
  slug: string;
  name: string;
  category: WorkspaceModuleCategory;
  description: string;
  capability_slug?: string | null;
  integration_slug?: string | null;
  sort_order: number;
};

export const WORKSPACE_MODULE_CATEGORY_LABELS: Record<WorkspaceModuleCategory, string> = {
  core: "Core",
  operations: "Operations",
  commercial: "Commercial",
  finance: "Finance",
  advanced: "Advanced",
};

/** Fallback catalog when DB table is unavailable (mirrors migration seed). */
export const WORKSPACE_MODULE_CATALOG_FALLBACK: WorkspaceModuleCatalogItem[] = [
  { slug: "properties", name: "Properties", category: "core", description: "Property and unit portfolio management.", capability_slug: "management", sort_order: 10 },
  { slug: "users", name: "Users & Teams", category: "core", description: "Team members, roles, and invitations.", sort_order: 20 },
  { slug: "communications", name: "Communications", category: "core", description: "Inbox, messaging, and client communications.", capability_slug: "management", sort_order: 30 },
  { slug: "maintenance", name: "Maintenance", category: "operations", description: "Work orders, technicians, and SLAs.", capability_slug: "facilities", sort_order: 40 },
  { slug: "inspections", name: "Inspections", category: "operations", description: "Field inspections and checklists.", capability_slug: "facilities", sort_order: 50 },
  { slug: "utilities", name: "Utilities & Metering", category: "operations", description: "Sub-metering and utility billing.", capability_slug: "facilities", sort_order: 60 },
  { slug: "sales", name: "Sales", category: "commercial", description: "Listings, leads, and deal pipeline.", capability_slug: "sales", sort_order: 70 },
  { slug: "crm", name: "CRM", category: "commercial", description: "Contacts, tasks, and customer 360.", capability_slug: "sales", sort_order: 80 },
  { slug: "leasing", name: "Leasing", category: "commercial", description: "Applications, leases, and tenant onboarding.", capability_slug: "leasing", sort_order: 90 },
  { slug: "accounting", name: "Accounting", category: "finance", description: "GL, journal entries, and financial reports.", capability_slug: "management", sort_order: 100 },
  { slug: "collections", name: "Collections", category: "finance", description: "Arrears, payment plans, and cases.", capability_slug: "management", sort_order: 110 },
  { slug: "procurement", name: "Procurement", category: "finance", description: "Vendors, purchase orders, and payables.", capability_slug: "management", sort_order: 120 },
  { slug: "ai", name: "AI & Automation", category: "advanced", description: "AI briefing, lease analyzer, and automations.", sort_order: 130 },
  { slug: "analytics", name: "Analytics", category: "advanced", description: "Portfolio analytics and market intelligence.", sort_order: 140 },
  { slug: "integrations", name: "API & Integrations", category: "advanced", description: "Third-party connectors and webhooks.", sort_order: 150 },
];

export type DashboardWidgetId =
  | "pipeline"
  | "revenue"
  | "listings"
  | "viewings"
  | "team"
  | "quick_actions"
  | "ai_briefing"
  | "compliance"
  | "recent_activity";

export const DASHBOARD_WIDGET_CATALOG: Array<{
  id: DashboardWidgetId;
  label: string;
  description: string;
}> = [
  { id: "pipeline", label: "Deal pipeline", description: "Lead and deal stage summary" },
  { id: "revenue", label: "Revenue", description: "Payments and collections overview" },
  { id: "listings", label: "Listings", description: "Active listings and occupancy" },
  { id: "viewings", label: "Viewings", description: "Upcoming property viewings" },
  { id: "team", label: "Team", description: "Team size and activity" },
  { id: "quick_actions", label: "Quick actions", description: "Shortcuts to common tasks" },
  { id: "ai_briefing", label: "AI briefing", description: "AI operations summary" },
  { id: "compliance", label: "Compliance", description: "Trust and compliance signals" },
  { id: "recent_activity", label: "Recent activity", description: "Latest workspace events" },
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = DASHBOARD_WIDGET_CATALOG.map((w) => w.id);

/** Maps workspace nav slugs to module catalog slugs for entitlement gating. */
export const NAV_SLUG_MODULE_MAP: Record<string, string> = {
  listings: "sales",
  leads: "crm",
  contacts: "crm",
  tasks: "crm",
  calendar: "sales",
  payments: "accounting",
  leases: "leasing",
  maintenance: "maintenance",
  inspections: "inspections",
  "utility-metering": "utilities",
  "market-intelligence": "analytics",
  "ai-assistant": "ai",
  "ai-operations": "ai",
  "ai-rent-yield": "ai",
  "ai-command-center": "ai",
  automation: "ai",
  "automation-builder": "ai",
  workflows: "ai",
  "workflow-approval": "ai",
  integrations: "integrations",
  "module-marketplace": "integrations",
  procurement: "procurement",
  "general-ledger": "accounting",
  "chart-of-accounts": "accounting",
  "collections-cases": "collections",
  team: "users",
  "tenant-screening": "leasing",
  "leasing-applications": "leasing",
};

export function isNavSlugEnabledByModules(
  navSlug: string,
  enabledModules: string[] | undefined,
): boolean {
  if (!enabledModules?.length) return true;
  const moduleSlug = NAV_SLUG_MODULE_MAP[navSlug];
  if (!moduleSlug) return true;
  return enabledModules.includes(moduleSlug);
}

export function isDashboardWidgetEnabled(
  enabled: DashboardWidgetId[] | undefined,
  widgetId: DashboardWidgetId,
): boolean {
  if (!enabled?.length) return true;
  return enabled.includes(widgetId);
}
