import type { MemberRole } from "../../lib/workspace";
import { canWorkspace, type WorkspacePermission } from "../../lib/workspace-permissions";
import { clientIntegrations } from "../../lib/integrations";

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
  "market-intelligence": "leads:read",
  trust: "listings:read",
  compliance: "finance:read",
  automation: "team:manage",
  "ai-assistant": "leads:read",
  settings: null,
  "fraud-alerts": "team:manage",
  vendors: "listings:write",
  "location-intelligence": "leads:read",
  "org-insights": "finance:read",
  notifications: null,
  whitelabel: "team:manage",
  "mobile-settings": "team:manage",
  integrations: "team:manage",
  blockchain: "team:manage",
  host: "listings:write",
  finance: "finance:read",
  "advanced-search": "leads:read",
  "predictive-analytics": "leads:read",
  recommendations: "leads:read",
  "team-collaboration": "team:manage",
  workflows: "team:manage",
  new: "listings:write",
};

export function canAccessWorkspaceSlug(
  slug: string,
  role: MemberRole | null | undefined,
): boolean {
  if (slug === "blockchain" && !clientIntegrations.blockchain.configured) {
    return false;
  }

  const permission = WORKSPACE_SLUG_PERMISSIONS[slug];
  if (permission === undefined) {
    return slug === "";
  }
  if (permission === null) {
    return true;
  }

  return canWorkspace(role, permission);
}

export function filterWorkspaceNavItems<T extends { slug: string }>(
  items: T[],
  role: MemberRole | null | undefined,
): T[] {
  return items.filter((item) => canAccessWorkspaceSlug(item.slug, role));
}

/** All routable workspace page slugs (excludes dashboard). */
export const WORKSPACE_PAGE_SLUGS = Object.keys(WORKSPACE_SLUG_PERMISSIONS).filter(
  (slug) => slug !== "",
);

export function getWorkspaceRoleDescription(role: MemberRole | null | undefined): string {
  switch (role) {
    case "owner":
      return "Full access to listings, finance, team, and settings.";
    case "manager":
      return "Manage listings, leads, payouts, and your team.";
    case "agent":
      return "List properties, work leads, and manage day-to-day deals.";
    case "analyst":
      return "Read-only analytics and reporting across the workspace.";
    default:
      return "Workspace member";
  }
}
