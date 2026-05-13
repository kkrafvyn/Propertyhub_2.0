import type { Database } from "./database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type MemberRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"];

export interface MembershipRow {
  organization: Organization | Organization[] | null;
  role: MemberRole;
}

export interface OrganizationMembership {
  organization: Organization;
  role: MemberRole;
}

export const WORKSPACE_ENTRY_PATH = "/workspace";

export function normalizeOrganizationMemberships(
  rows: MembershipRow[] | null | undefined
) {
  return (rows || []).reduce<OrganizationMembership[]>((acc, row) => {
    const organization = Array.isArray(row.organization)
      ? row.organization[0]
      : row.organization;

    if (organization) {
      acc.push({ organization, role: row.role });
    }

    return acc;
  }, []);
}

export function toOrganizationSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getWorkspaceRoute(slug: string, page?: string) {
  return page ? `${WORKSPACE_ENTRY_PATH}/${slug}/${page}` : `${WORKSPACE_ENTRY_PATH}/${slug}`;
}
