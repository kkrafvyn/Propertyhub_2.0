import { canWorkspace, type WorkspacePermission } from './workspace-permissions';
import type { MemberRole } from './workspace';

export type OrganizationPermissionInput = {
  userOrganizationIds: string[];
  targetOrganizationId?: string | null;
  role?: MemberRole | null;
  permission?: WorkspacePermission;
  isPlatformAdmin?: boolean;
  isPlatformStaff?: boolean;
};

export function canAccessOrganizationForAction(input: OrganizationPermissionInput): boolean {
  const {
    userOrganizationIds,
    targetOrganizationId,
    role,
    permission,
    isPlatformAdmin = false,
    isPlatformStaff = false,
  } = input;

  if (isPlatformAdmin || isPlatformStaff) return true;
  if (!targetOrganizationId) return false;
  if (!userOrganizationIds.includes(targetOrganizationId)) return false;
  if (!permission) return true;

  return canWorkspace(role, permission);
}

export function assertOrganizationAccess(input: OrganizationPermissionInput): void {
  const error = getAuthorizationError(input);

  if (error !== 'Authorization granted.') {
    throw new Error(error);
  }
}

export function getAuthorizationError(input: OrganizationPermissionInput): string {
  if (!input.targetOrganizationId) {
    return 'Authorization denied: missing organization context.';
  }

  if (
    !input.userOrganizationIds.includes(input.targetOrganizationId) &&
    !input.isPlatformAdmin &&
    !input.isPlatformStaff
  ) {
    return 'Authorization denied: user is not a member of this organization.';
  }

  if (
    input.permission &&
    !canWorkspace(input.role, input.permission) &&
    !input.isPlatformAdmin &&
    !input.isPlatformStaff
  ) {
    return `Authorization denied: role does not permit ${input.permission}.`;
  }

  return 'Authorization granted.';
}
