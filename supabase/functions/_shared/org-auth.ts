import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { HttpError } from "./http.ts";

/** Organization roles permitted to initiate finance operations (matches RLS alignment migration). */
export const FINANCE_MEMBER_ROLES = [
  "owner",
  "manager",
  "finance_manager",
  "finance_officer",
  "collections_officer",
  "head_property_management",
] as const;

/** Roles permitted to send estate operational SMS (gate passes, utility alerts). */
export const ESTATE_MESSAGING_ROLES = [
  ...FINANCE_MEMBER_ROLES,
  "property_manager",
  "operations",
] as const;

type MembershipRow = { role: string };

export async function requireOrgMembership(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
  allowedRoles?: readonly string[],
): Promise<MembershipRow> {
  if (!organizationId?.trim()) {
    throw new HttpError(400, "organizationId is required");
  }

  const { data: membership, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!membership) {
    throw new HttpError(403, "You are not a member of this organization");
  }

  if (allowedRoles && !allowedRoles.includes(String(membership.role))) {
    throw new HttpError(403, "Insufficient organization permissions");
  }

  return membership;
}

export async function requireFinanceMembership(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<MembershipRow> {
  return requireOrgMembership(admin, userId, organizationId, FINANCE_MEMBER_ROLES);
}

export async function requireEstateMessagingMembership(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<MembershipRow> {
  return requireOrgMembership(admin, userId, organizationId, ESTATE_MESSAGING_ROLES);
}

export async function assertOrgAiEnabled(admin: SupabaseClient, organizationId: string) {
  const { data, error } = await admin
    .from("ai_org_controls")
    .select("globally_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (data && data.globally_enabled === false) {
    throw new HttpError(403, "AI is disabled for this organization");
  }
}

export async function assertAiToolAllowed(
  admin: SupabaseClient,
  organizationId: string,
  toolName: string,
) {
  const { data, error } = await admin
    .from("ai_tool_allowlist")
    .select("enabled")
    .eq("organization_id", organizationId)
    .eq("tool_name", toolName)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (data && data.enabled === false) {
    throw new HttpError(403, `AI tool "${toolName}" is disabled for this organization`);
  }
}

export async function requireOrgAiAccess(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
  toolName?: string,
) {
  await requireOrgMembership(admin, userId, organizationId);
  await assertOrgAiEnabled(admin, organizationId);
  if (toolName) {
    await assertAiToolAllowed(admin, organizationId, toolName);
  }
}

export async function requireVisitorPassInOrg(
  admin: SupabaseClient,
  passId: string,
  organizationId: string,
) {
  const { data: pass, error } = await admin
    .from("estate_visitor_passes")
    .select("id, estate_id, estate:managed_estates(organization_id)")
    .eq("id", passId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!pass) {
    throw new HttpError(404, "Visitor pass not found");
  }

  const passOrgId = (pass.estate as { organization_id?: string } | null)?.organization_id;
  if (passOrgId !== organizationId) {
    throw new HttpError(403, "Visitor pass does not belong to this organization");
  }

  return pass;
}
