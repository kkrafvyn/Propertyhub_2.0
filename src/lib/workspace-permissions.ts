import type { MemberRole } from "./workspace";

export type WorkspacePermission =
  | "listings:read"
  | "listings:write"
  | "leads:read"
  | "leads:write"
  | "finance:read"
  | "finance:write"
  | "team:manage"
  | "documents:write"
  | "contacts:write"
  | "tasks:write";

export const ALL_WORKSPACE_PERMISSIONS: WorkspacePermission[] = [
  "listings:read",
  "listings:write",
  "leads:read",
  "leads:write",
  "finance:read",
  "finance:write",
  "team:manage",
  "documents:write",
  "contacts:write",
  "tasks:write",
];

const ROLE_DEFAULTS: Record<string, WorkspacePermission[]> = {
  // Executive
  owner: ALL_WORKSPACE_PERMISSIONS,
  managing_director: ALL_WORKSPACE_PERMISSIONS,
  organization_admin: ALL_WORKSPACE_PERMISSIONS,
  platform_admin: ALL_WORKSPACE_PERMISSIONS,
  enterprise_operator: ALL_WORKSPACE_PERMISSIONS,

  // Property Management
  head_property_management: ALL_WORKSPACE_PERMISSIONS,
  manager: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "finance:read",
    "finance:write",
    "team:manage",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  property_manager: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "finance:read",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  facilities_manager: [
    "listings:read",
    "listings:write",
    "tasks:write",
    "documents:write",
  ],
  estate_officer: [
    "listings:read",
    "tasks:write",
    "documents:write",
  ],
  caretaker: [
    "listings:read",
    "tasks:write",
  ],
  technician: [
    "listings:read",
    "tasks:write",
  ],

  // Finance
  finance_manager: [
    "listings:read",
    "finance:read",
    "finance:write",
    "team:manage",
    "documents:write",
  ],
  finance_officer: [
    "listings:read",
    "finance:read",
    "finance:write",
    "documents:write",
  ],
  collections_officer: [
    "listings:read",
    "finance:read",
    "leads:read",
    "tasks:write",
  ],

  // Sales & Marketing
  sales_manager: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "contacts:write",
    "tasks:write",
    "documents:write",
    "team:manage",
  ],
  agent: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  sales_agent: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  marketing_manager: [
    "listings:read",
    "listings:write",
    "leads:read",
    "team:manage",
  ],
  marketing_officer: [
    "listings:read",
    "listings:write",
    "leads:read",
  ],

  // Customer Service & Analytics
  customer_service_manager: [
    "listings:read",
    "leads:read",
    "leads:write",
    "contacts:write",
    "tasks:write",
    "team:manage",
  ],
  customer_service_agent: [
    "listings:read",
    "leads:read",
    "leads:write",
    "contacts:write",
    "tasks:write",
  ],
  analyst: ["listings:read", "leads:read", "finance:read"],
  platform_analyst: ["listings:read", "leads:read", "finance:read"],

  // External / Partner
  property_owner: ["listings:read", "finance:read"],
  contractor: ["listings:read", "tasks:write"],
  vendor: ["listings:read", "tasks:write"],
  developer: [
    "listings:read",
    "listings:write",
    "leads:read",
    "documents:write",
  ],
};

export function getMemberPermissions(
  role: MemberRole | null | undefined,
  customPermissions?: string[] | null
): WorkspacePermission[] {
  const defaults = role ? ROLE_DEFAULTS[role] || ROLE_DEFAULTS["manager"] || [] : [];
  if (!customPermissions || customPermissions.length === 0) return defaults;
  return Array.from(new Set([...defaults, ...(customPermissions as WorkspacePermission[])]));
}

export function canWorkspace(
  role: MemberRole | null | undefined,
  permission: WorkspacePermission,
  customPermissions?: string[] | null
) {
  return getMemberPermissions(role, customPermissions).includes(permission);
}

export const WORKSPACE_PERMISSION_LABELS: Record<WorkspacePermission, string> = {
  "listings:read": "View listings",
  "listings:write": "Manage listings",
  "leads:read": "View leads",
  "leads:write": "Manage leads",
  "finance:read": "View finance",
  "finance:write": "Manage payouts",
  "team:manage": "Manage team",
  "documents:write": "Manage documents",
  "contacts:write": "Manage contacts",
  "tasks:write": "Manage tasks",
};
