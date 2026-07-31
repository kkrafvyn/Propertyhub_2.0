import { supabase } from "../supabase";

const WORKSPACE_MFA_ROLES = new Set(["owner", "manager"]);

export function workspaceRoleRequiresMfa(role?: string | null) {
  return WORKSPACE_MFA_ROLES.has(String(role || "").toLowerCase());
}

export async function hasMfaAssurance() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  if (data?.nextLevel === "aal2") {
    return data.currentLevel === "aal2";
  }
  return true;
}

export async function userHasEnrolledMfa() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  const factors = data?.totp || [];
  return factors.some((factor) => factor.status === "verified");
}
