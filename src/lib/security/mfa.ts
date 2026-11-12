import { supabase } from "../supabase";
import { canWorkspace, type WorkspacePermission } from "../workspace-permissions";
import type { MemberRole } from "../workspace";

const MFA_SENSITIVE_PERMISSIONS: WorkspacePermission[] = ["finance:write", "team:manage"];

/** Session-only deferral so owners/managers can continue into workspace before enrolling TOTP. */
const WORKSPACE_MFA_SKIP_KEY = "baytmiftah.workspaceMfaSkip";

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

export function hasWorkspaceMfaSkip(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(WORKSPACE_MFA_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWorkspaceMfaSkip(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(WORKSPACE_MFA_SKIP_KEY, "1");
  } catch {
    // ignore quota / private-mode failures
  }
}

export function clearWorkspaceMfaSkip(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(WORKSPACE_MFA_SKIP_KEY);
  } catch {
    // ignore
  }
}

/** Workspace/admin gates fail closed unless an enrolled factor and current AAL2 are confirmed. */
export async function hasMfaAssurance() {
  try {
    const enrolled = await userHasEnrolledMfa();
    if (!enrolled) return false;
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return !error && data?.currentLevel === "aal2";
  } catch {
    return false;
  }
}

export async function userHasEnrolledMfa() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  const factors = data?.totp || [];
  return factors.some((factor) => factor.status === "verified");
}
