import type { WorkspacePermission } from "./workspace-permissions";
import {
  ALL_WORKSPACE_PERMISSIONS,
  WORKSPACE_PERMISSION_LABELS,
  getMemberPermissions,
} from "./workspace-permissions";
import type { MemberRole } from "./workspace";
import type { RoleAssignerContext } from "./role-assignment";

export { WORKSPACE_PERMISSION_LABELS };

export const PERMISSION_GROUPS: Array<{
  label: string;
  permissions: WorkspacePermission[];
}> = [
  {
    label: "Listings & properties",
    permissions: ["listings:read", "listings:write"],
  },
  {
    label: "CRM & leads",
    permissions: ["leads:read", "leads:write", "contacts:write", "tasks:write"],
  },
  {
    label: "Finance",
    permissions: ["finance:read", "finance:write"],
  },
  {
    label: "Administration",
    permissions: ["team:manage", "documents:write"],
  },
];

const EXECUTIVE_ROLES = new Set<MemberRole>(["owner", "managing_director", "organization_admin"]);

export function canGrantPermission(
  context: RoleAssignerContext,
  permission: WorkspacePermission,
): boolean {
  const assignerRole = context.assignerRole;
  if (!assignerRole) return false;
  if (EXECUTIVE_ROLES.has(assignerRole)) return true;
  return getMemberPermissions(assignerRole, context.assignerPermissions).includes(permission);
}

export function getGrantablePermissions(context: RoleAssignerContext): WorkspacePermission[] {
  return ALL_WORKSPACE_PERMISSIONS.filter((permission) => canGrantPermission(context, permission));
}

export function summarizePermissionState(
  role: MemberRole | null | undefined,
  customPermissions: string[] | null | undefined,
) {
  const effective = new Set(getMemberPermissions(role, customPermissions));
  return ALL_WORKSPACE_PERMISSIONS.map((permission) => ({
    permission,
    label: WORKSPACE_PERMISSION_LABELS[permission],
    enabled: effective.has(permission),
    fromRole: getMemberPermissions(role, null).includes(permission),
    custom: Boolean(customPermissions?.includes(permission)),
  }));
}
