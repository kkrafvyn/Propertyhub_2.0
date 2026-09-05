import type { Database } from "./database.types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type StandardMemberRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"];

export type ExtendedCompanyRole =
  | "managing_director"
  | "head_property_management"
  | "property_manager"
  | "facilities_manager"
  | "estate_officer"
  | "caretaker"
  | "technician"
  | "finance_manager"
  | "finance_officer"
  | "collections_officer"
  | "sales_manager"
  | "sales_agent"
  | "marketing_manager"
  | "marketing_officer"
  | "customer_service_manager"
  | "customer_service_agent"
  | "organization_admin"
  | "developer"
  | "enterprise_operator";

export type PlatformRole =
  | "platform_admin"
  | "platform_ops"
  | "trust_safety"
  | "platform_support"
  | "platform_finance"
  | "platform_analyst"
  | "platform_dev";

export type ExternalRole = "property_owner" | "contractor" | "vendor";

export type MemberRole = StandardMemberRole | ExtendedCompanyRole | PlatformRole | ExternalRole;

export interface MembershipRow {
  organization: Organization | Organization[] | null;
  role: MemberRole;
  permissions?: string[] | null;
  department_id?: string | null;
}

export interface OrganizationMembership {
  organization: Organization;
  role: MemberRole;
  permissions?: string[] | null;
  department_id?: string | null;
}

export const WORKSPACE_ENTRY_PATH = "/workspace";

function normalizeMemberPermissions(value: unknown): string[] | null {
  if (Array.isArray(value)) return value as string[];
  return null;
}

export function normalizeOrganizationMemberships(
  rows: MembershipRow[] | null | undefined
) {
  return (rows || []).reduce<OrganizationMembership[]>((acc, row) => {
    const organization = Array.isArray(row.organization)
      ? row.organization[0]
      : row.organization;

    if (organization) {
      acc.push({
        organization,
        role: row.role,
        permissions: normalizeMemberPermissions(row.permissions),
        department_id: row.department_id ?? null,
      });
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
