/**
 * Edge-function mirror of src/lib/workspace-permissions.ts role defaults.
 * Keep finance / team checks aligned with the app when updating ROLE_DEFAULTS.
 *
 * Other functions still using role allowlists (document for follow-up):
 * - initiate-payangels-disbursement, dispatch-notification, estate SMS helpers
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { HttpError } from "./http.ts";

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

const ALL: WorkspacePermission[] = [
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
  owner: ALL,
  managing_director: ALL,
  organization_admin: ALL,
  platform_admin: ALL,
  enterprise_operator: ALL,
  head_property_management: [
    "listings:read",
    "listings:write",
    "leads:read",
    "documents:write",
    "contacts:write",
    "tasks:write",
  ],
  manager: [
    "listings:read",
    "listings:write",
    "leads:read",
    "finance:read",
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
  facilities_manager: ["listings:read", "listings:write", "tasks:write", "documents:write"],
  estate_officer: ["listings:read", "tasks:write", "documents:write"],
  caretaker: ["listings:read", "tasks:write"],
  technician: ["listings:read", "tasks:write"],
  finance_manager: ["listings:read", "finance:read", "finance:write", "team:manage", "documents:write"],
  finance_officer: ["listings:read", "finance:read", "finance:write", "documents:write"],
  collections_officer: ["listings:read", "finance:read", "leads:read", "tasks:write"],
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
  marketing_manager: ["listings:read", "listings:write", "leads:read", "team:manage"],
  marketing_officer: ["listings:read", "listings:write", "leads:read"],
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
  property_owner: ["listings:read", "finance:read"],
  contractor: ["listings:read", "tasks:write"],
  vendor: ["listings:read", "tasks:write"],
  developer: ["listings:read", "listings:write", "leads:read", "documents:write"],
};

export function roleHasWorkspacePermission(
  role: string | null | undefined,
  permission: WorkspacePermission,
  customPermissions?: string[] | null,
): boolean {
  const defaults = role ? ROLE_DEFAULTS[role] || [] : [];
  const merged = customPermissions?.length
    ? Array.from(new Set([...defaults, ...customPermissions]))
    : defaults;
  return merged.includes(permission);
}

type MemberRow = { role: string; permissions?: unknown };

export async function requireOrgWorkspacePermission(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
  permission: WorkspacePermission,
): Promise<MemberRow> {
  if (!organizationId?.trim()) {
    throw new HttpError(400, "organizationId is required");
  }

  const { data: actor, error: actorError } = await admin
    .from("users")
    .select("is_platform_admin, banned, account_deletion_requested_at")
    .eq("id", userId)
    .maybeSingle();

  if (actorError || !actor || actor.banned || actor.account_deletion_requested_at) {
    throw new HttpError(403, "Account access has been revoked or could not be verified");
  }

  if (actor.is_platform_admin) {
    return { role: "platform_admin" };
  }

  const { data: membership, error } = await admin
    .from("organization_members")
    .select("role, permissions")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!membership) {
    throw new HttpError(403, "You are not a member of this organization");
  }

  const custom = Array.isArray(membership.permissions)
    ? (membership.permissions as string[])
    : null;

  if (!roleHasWorkspacePermission(membership.role, permission, custom)) {
    throw new HttpError(403, `Missing required workspace permission: ${permission}`);
  }

  return membership;
}
