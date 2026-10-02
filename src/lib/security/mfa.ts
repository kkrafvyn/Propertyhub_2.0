import { supabase } from "../supabase";
import { canWorkspace, type WorkspacePermission } from "../workspace-permissions";
import type { MemberRole } from "../workspace";

const MFA_SENSITIVE_PERMISSIONS: WorkspacePermission[] = ["finance:write", "team:manage"];

/** Operational workspace roles that always require MFA (even without finance/team permissions). */
const WORKSPACE_MFA_ROLES = new Set<MemberRole>([
  "owner",
  "manager",
  "managing_director",
  "organization_admin",
]);

export function workspaceRoleRequiresMfa(
  role?: string | null,
  customPermissions?: string[] | null,
) {
  const normalized = (role ?? "").trim().toLowerCase() as MemberRole;
  if (normalized && WORKSPACE_MFA_ROLES.has(normalized)) {
    return true;
  }
  return MFA_SENSITIVE_PERMISSIONS.some((permission) =>
    canWorkspace(role as MemberRole, permission, customPermissions),
  );
}

/** Workspace/admin gates: require enrolled TOTP and current AAL2 when step-up is available. */
export async function hasMfaAssurance() {
  const enrolled = await userHasEnrolledMfa();
  if (!enrolled) {
    return false;
  }
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  if (data?.nextLevel === "aal2") {
    return data.currentLevel === "aal2";
  }
  return enrolled;
}

export async function userHasEnrolledMfa() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  const factors = data?.totp || [];
  return factors.some((factor) => factor.status === "verified");
}
