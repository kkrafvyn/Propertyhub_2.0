export type OrganizationAccessCheckInput = {
  userOrganizationIds: string[];
  targetOrganizationId?: string | null;
  isPlatformAdmin?: boolean;
};

export function canAccessOrganization(input: OrganizationAccessCheckInput): boolean {
  const { userOrganizationIds, targetOrganizationId, isPlatformAdmin = false } = input;

  if (!targetOrganizationId) return false;
  if (isPlatformAdmin) return true;

  return userOrganizationIds.includes(targetOrganizationId);
}

export function getOrganizationAccessError(input: OrganizationAccessCheckInput): string {
  if (!input.targetOrganizationId) {
    return 'Access denied: missing organization context.';
  }

  if (canAccessOrganization(input)) {
    return 'Access granted.';
  }

  return 'Access denied: user is not a member of this organization.';
}
