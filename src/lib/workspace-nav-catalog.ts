export type WorkspaceNavGroup = "core" | "tools" | "more" | "ai" | "enterprise";

export type WorkspaceNavCatalogItem = {
  slug: string;
  label: string;
  group: WorkspaceNavGroup;
};

/** Master catalog for Customize Workspace (labels mirror WorkspaceLayout nav). */
export const WORKSPACE_NAV_CATALOG: WorkspaceNavCatalogItem[] = [
  { slug: "", label: "Dashboard", group: "core" },
  { slug: "listings", label: "Listings", group: "core" },
  { slug: "leads", label: "Leads", group: "core" },
  { slug: "contacts", label: "Contacts", group: "core" },
  { slug: "tasks", label: "Tasks", group: "core" },
  { slug: "calendar", label: "Calendar", group: "core" },
  { slug: "payments", label: "Payments", group: "core" },
  { slug: "team", label: "Team", group: "core" },
  { slug: "documents", label: "Documents", group: "core" },
  { slug: "leases", label: "Leases", group: "core" },
  { slug: "maintenance", label: "Maintenance", group: "core" },
  { slug: "inspections", label: "Inspections", group: "core" },
  { slug: "my-work", label: "My Work", group: "core" },
  { slug: "estate-operations", label: "Estate Operations", group: "core" },
  { slug: "estate-finance", label: "Estate Finance", group: "core" },
  { slug: "company-launchpad", label: "Company Launchpad", group: "core" },
  { slug: "market-intelligence", label: "Analytics", group: "tools" },
  { slug: "trust", label: "Trust", group: "tools" },
  { slug: "compliance", label: "Compliance", group: "tools" },
  { slug: "international-rules", label: "International Markets", group: "tools" },
  { slug: "automation", label: "Automation", group: "tools" },
  { slug: "module-marketplace", label: "Module Marketplace", group: "tools" },
  { slug: "ai-assistant", label: "AI", group: "tools" },
  { slug: "settings", label: "Settings", group: "tools" },
  { slug: "customize-workspace", label: "Customize Workspace", group: "tools" },
  { slug: "whitelabel", label: "White-Label", group: "more" },
  { slug: "integrations", label: "Integrations", group: "more" },
  { slug: "blockchain", label: "Blockchain Transactions", group: "more" },
  { slug: "notifications", label: "Notifications", group: "more" },
  { slug: "ai-rent-yield", label: "AI Yield Predictor", group: "ai" },
  { slug: "enterprise-operations", label: "Enterprise Operations", group: "enterprise" },
  { slug: "team-collaboration", label: "Team Hub", group: "enterprise" },
  { slug: "workflow-approval", label: "Approval Chains", group: "enterprise" },
  { slug: "workflows", label: "Workflows", group: "enterprise" },
];

export const TERMINOLOGY_PRESETS: Array<{ slug: string; label: string; placeholder: string }> = [
  { slug: "leases", label: "Leases", placeholder: "Tenancies" },
  { slug: "listings", label: "Listings", placeholder: "Properties" },
  { slug: "leads", label: "Leads", placeholder: "Prospects" },
  { slug: "maintenance", label: "Maintenance", placeholder: "Work Orders" },
  { slug: "contacts", label: "Contacts", placeholder: "Clients" },
  { slug: "team", label: "Team", placeholder: "Staff" },
];

export const DEFAULT_HOME_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "", label: "Executive Dashboard" },
  { slug: "my-work", label: "My Work" },
  { slug: "listings", label: "Portfolio / Listings" },
  { slug: "estate-operations", label: "Operations" },
  { slug: "leads", label: "Sales / CRM" },
  { slug: "estate-finance", label: "Finance" },
  { slug: "maintenance", label: "Maintenance" },
];

/** Slugs hidden by default for personal property workspaces until customized. */
export const PERSONAL_WORKSPACE_DEFAULT_HIDDEN: string[] = [
  "company-launchpad",
  "team-collaboration",
  "workflows",
  "data-migration",
  "enterprise-operations",
  "command-center",
  "customer-health",
  "whitelabel",
];

export function getNavCatalogLabel(slug: string): string {
  return WORKSPACE_NAV_CATALOG.find((item) => item.slug === slug)?.label ?? slug.replace(/-/g, " ");
}
