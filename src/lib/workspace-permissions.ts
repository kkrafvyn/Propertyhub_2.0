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

const ROLE_DEFAULTS: Record<MemberRole, WorkspacePermission[]> = {
  owner: [
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
  agent: [
    "listings:read",
    "listings:write",
    "leads:read",
    "leads:write",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  analyst: ["listings:read", "leads:read", "finance:read"],
};

export function getMemberPermissions(
  role: MemberRole | null | undefined,
  customPermissions?: string[] | null
): WorkspacePermission[] {
  const defaults = role ? ROLE_DEFAULTS[role] || [] : [];
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
