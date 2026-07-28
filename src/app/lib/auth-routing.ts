import { isFullAdminRole, isWorkspaceRole } from "./baytmiftah/roles";

type AuthUser = {
  app_metadata?: { role?: string };
  user_metadata?: { role?: string };
} | null;

type AuthProfile = { role?: string; is_platform_admin?: boolean } | null;

/** Resolve where to send a user after login when no explicit ?next= is provided. */
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

  if (profile?.is_platform_admin || isFullAdminRole(user.user_metadata?.role)) {
    return "/admin";
  }

  const role = user.user_metadata?.role || user.app_metadata?.role || profile?.role;
  if (isWorkspaceRole(role)) {
    return "/workspace";
  }

  return "/app";
}

export function accountTypeToAppRole(accountType: "user" | "landlord"): string {
  return accountType === "landlord" ? "host" : "consumer";
}
