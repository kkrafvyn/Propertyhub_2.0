import type { User } from "@supabase/supabase-js";
import { getMetadataRole, isFullAdminRole, isWorkspaceRole } from "./baytmiftah/roles";

type AuthUser = User | { user_metadata?: unknown; app_metadata?: unknown } | null;

type AuthProfile = { role?: string; is_platform_admin?: boolean } | null;

/** Resolve the dashboard for the shared web app after login. */
export function resolvePostAuthRedirect(
  user: AuthUser,
  profile: AuthProfile,
  explicitRedirect?: string | null,
): string {
  if (!user) {
    return explicitRedirect || "/app";
  }

  if (explicitRedirect && explicitRedirect !== "/app") {
    return explicitRedirect;
  }

  const metadataRole = getMetadataRole(user.user_metadata) || getMetadataRole(user.app_metadata);
  if (profile?.is_platform_admin || isFullAdminRole(metadataRole)) {
    return "/admin";
  }

  const role = metadataRole || profile?.role;
  if (isWorkspaceRole(role)) {
    return "/workspace";
  }

  return "/app";
}

export function accountTypeToAppRole(accountType: "user" | "landlord"): string {
  return accountType === "landlord" ? "host" : "consumer";
}
