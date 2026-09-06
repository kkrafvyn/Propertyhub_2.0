import type { MemberRole } from "../../lib/workspace";
import { canWorkspace, type WorkspacePermission } from "../../lib/workspace-permissions";
import { clientIntegrations } from "../../lib/integrations";
import {
  isSlugEnabledForCapabilities,
  type CompanyCapability,
} from "../../lib/company-model";

/** Minimum permission to see a workspace sidebar page. */
export const WORKSPACE_SLUG_PERMISSIONS: Record<string, WorkspacePermission | null> = {
  "": null,
  listings: "listings:read",
  leads: "leads:read",
  contacts: "leads:read",
  tasks: "leads:read",
  calendar: "leads:read",
  payments: "finance:read",
  team: "team:manage",
  documents: "listings:read",
  leases: "listings:read",
  maintenance: "listings:read",
  inspections: "listings:read",
  "smart-property": "listings:read",
  "estate-operations": "listings:read",
  "estate-finance": "finance:read",
  "estate-communications": "leads:read",
  "contextual-inbox": "leads:read",
  "stakeholder-portals": "listings:read",
  "enterprise-operations": "listings:read",
  "command-center": "finance:read",
  "data-migration": "team:manage",
  "property-360": "listings:read",
  "customer-360": "leads:read",
  "technician-jobs": "listings:read",
  "ai-operations": "finance:read",
  "company-launchpad": "team:manage",
  "opening-balances": "finance:read",
  "payment-import": "finance:read",
  "estate-payables": "finance:read",
  "owner-statements": "finance:read",
  "service-desk": "leads:read",
  "unit-360": "listings:read",
  "utility-metering": "listings:read",
  "ai-lease-analyzer": "listings:read",
  "gate-clearance": "listings:read",
  "contractor-work-orders": "listings:write",
  "market-intelligence": "leads:read",
  trust: "listings:read",
  compliance: "finance:read",
  automation: "team:manage",
  "module-marketplace": "team:manage",
  "workflow-approval": "team:manage",
  "ai-assistant": "leads:read",
  settings: null,
  "fraud-alerts": "team:manage",
  vendors: "listings:write",
  "location-intelligence": "leads:read",
  "org-insights": "finance:read",
  notifications: null,
  "customize-workspace": "team:manage",
  whitelabel: "team:manage",
  "mobile-settings": "team:manage",
  integrations: "team:manage",
  blockchain: "team:manage",
  host: "listings:write",
  finance: "finance:read",
  "advanced-search": "leads:read",
  "predictive-analytics": "leads:read",
  "ai-rent-yield": "listings:read",
  "whatsapp-hub": "leads:read",
  "multi-currency-fx": "finance:read",
  recommendations: "leads:read",
  "team-collaboration": "team:manage",
  workflows: "team:manage",
  new: "listings:write",
  "general-ledger": "finance:read",
  procurement: "finance:read",
  "bank-reconciliation": "finance:read",
  "portfolio-analytics": "finance:read",
  "ai-command-center": "finance:read",
  "automation-builder": "team:manage",
  "bulk-operations": "finance:read",
  "data-import-export": "team:manage",
  "chart-of-accounts": "finance:read",
  "journal-entries": "finance:read",
  "financial-statements": "finance:read",
  "collections-cases": "finance:read",
  "leasing-applications": "listings:read",
  esignature: "listings:write",
  "owner-disbursements": "finance:read",
  "approval-center": "finance:read",
  "exception-center": "listings:read",
  "company-knowledge": "listings:read",
  "evidence-center": "finance:read",
  "customer-health": "team:manage",
  productivity: "listings:read",
  "my-work": null,
  "company-setup": null,
  "staff-time": "listings:read",
  "contractor-portal": "listings:read",
  "data-retention": "team:manage",
};

export function canAccessWorkspaceSlug(
  slug: string,
  role: MemberRole | null | undefined,
  customPermissions?: string[] | null,
  enabledCapabilities?: CompanyCapability[] | null,
): boolean {
  if (slug === "blockchain" && !clientIntegrations.blockchain.configured) {
    return false;
  }

  if (enabledCapabilities?.length && !isSlugEnabledForCapabilities(slug, enabledCapabilities)) {
    return false;
  }

  const permission = WORKSPACE_SLUG_PERMISSIONS[slug];
  if (permission === undefined) {
    return slug === "";
  }
  if (permission === null) {
    return true;
  }

  return canWorkspace(role, permission, customPermissions);
}

export function filterWorkspaceNavItems<T extends { slug: string }>(
  items: T[],
  role: MemberRole | null | undefined,
  customPermissions?: string[] | null,
  enabledCapabilities?: CompanyCapability[] | null,
): T[] {
  return items.filter((item) =>
    canAccessWorkspaceSlug(item.slug, role, customPermissions, enabledCapabilities),
  );
}

/** All routable workspace page slugs (excludes dashboard). */
export const WORKSPACE_PAGE_SLUGS = Object.keys(WORKSPACE_SLUG_PERMISSIONS).filter(
  (slug) => slug !== "",
);

export { getRoleHomeSlug } from "../../lib/company-model";

export function getWorkspaceRoleDescription(role: MemberRole | null | undefined): string {
  switch (role) {
    case "owner":
      return "Organization owner: full control over company, billing, and integrations.";
    case "managing_director":
      return "Executive leadership: portfolio revenue, yields, and strategic briefing.";
    case "head_property_management":
      return "Department head: entire portfolio SLAs, occupancy, and contractor budgets.";
    case "organization_admin":
      return "Organization admin: team, roles, settings, and integrations.";
    case "manager":
    case "property_manager":
      return "Property manager: leases, occupancies, work orders, and tenant follow-up.";
    case "facilities_manager":
      return "Facilities manager: physical assets, preventive maintenance, and utilities.";
    case "estate_officer":
      return "Estate officer: mobile inspections, meter readings, and on-site notices.";
    case "caretaker":
      return "Caretaker: day-to-day estate presence, defect logging, and resident assistance.";
    case "technician":
      return "In-house technician: mobile job queue, status updates, and material tracking.";
    case "finance_manager":
      return "Finance manager: general ledger, bank reconciliations, and owner statements.";
    case "finance_officer":
      return "Finance officer: payment allocations, receivable aging, and invoice processing.";
    case "collections_officer":
      return "Collections officer: arrears aging, payment plans, and legal notice enforcement.";
    case "sales_manager":
      return "Sales manager: deal pipelines, viewing schedules, and agent commissions.";
    case "agent":
    case "sales_agent":
      return "Leasing & sales agent: lead follow-up, property viewings, and Act 220 lease drafting.";
    case "marketing_manager":
    case "marketing_officer":
      return "Marketing: campaign management, promotion budgets, and channel analytics.";
    case "customer_service_manager":
    case "customer_service_agent":
      return "Customer service: resident inquiry intake, ticket routing, and SLA tracking.";
    case "analyst":
    case "platform_analyst":
      return "Data analyst: market intelligence, cap rate modeling, and compliance audits.";
    case "platform_admin":
    case "platform_ops":
      return "Platform administration: platform governance, moderation, and infrastructure.";
    case "property_owner":
      return "Property owner: individual asset oversight, unit statements, and yield tracking.";
    case "contractor":
    case "vendor":
      return "External service provider: quote submissions, job execution, and invoice tracking.";
    case "developer":
      return "Property developer: project handover, snagging, and unit warranty transition.";
    case "enterprise_operator":
      return "Enterprise operator: multi-company portfolio aggregation and cross-regional ops.";
    default:
      return "Workspace member";
  }
}
