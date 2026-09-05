import type { User } from "@supabase/supabase-js";
import { getWorkspaceRoute, WORKSPACE_ENTRY_PATH } from "./workspace";
import { getDesktopLastOrg } from "./desktop-navigation";
import { getMetadataRole, isFullAdminRole, isWorkspaceRole } from "../app/lib/baytmiftah/roles";
import { hasPlatformConsoleAccess } from "./platform-access";
import { isBusinessWebUser } from "./desktop-gateway";

type AuthProfile = { role?: string; is_platform_admin?: boolean; is_platform_manager?: boolean } | null;

const DESKTOP_AUTH_PATHS = ["/login", "/signup", "/reset-password", "/auth", "/verify-email", "/enrollment"];

/** Routes that belong to the consumer/marketing web app — not the desktop workstation. */
export function isDesktopConsumerOnlyRoute(pathname: string): boolean {
  if (DESKTOP_AUTH_PATHS.some((p) => pathname.startsWith(p))) return false;
  if (pathname.startsWith("/workspace") || pathname.startsWith("/admin")) return false;
  return true;
}

export function isDesktopAuthRoute(pathname: string): boolean {
  return DESKTOP_AUTH_PATHS.some((p) => pathname.startsWith(p));
}

/** Accounts allowed to use the workspace-only desktop app (not consumer shoppers). */
export function isDesktopAllowedUser(user: User | null, profile: AuthProfile): boolean {
  if (!user) return false;

  const metadataRole = getMetadataRole(user.user_metadata) || getMetadataRole(user.app_metadata);
  if (hasPlatformConsoleAccess(profile) || isFullAdminRole(metadataRole)) {
    return true;
  }

  return isBusinessWebUser(user, profile);
}

/**
 * Where Electron should send authenticated professional users.
 */
export function resolveDesktopProfessionalHome(
  user: User | null,
  profile: AuthProfile,
): string {
  if (!user) {
    return "/login";
  }

  if (!isDesktopAllowedUser(user, profile)) {
    if (!profile) {
      return WORKSPACE_ENTRY_PATH;
    }
    return "/login?reason=business-only";
  }

  const metadataRole = getMetadataRole(user.user_metadata) || getMetadataRole(user.app_metadata);
  if (hasPlatformConsoleAccess(profile) || isFullAdminRole(metadataRole)) {
    return "/admin";
  }

  const role = metadataRole || profile?.role;
  if (isWorkspaceRole(role) || role === "host" || role === "landlord") {
    const lastOrg = getDesktopLastOrg();
    if (lastOrg) {
      return getWorkspaceRoute(lastOrg, "my-work");
    }
    return WORKSPACE_ENTRY_PATH;
  }

  // Desktop is professional-first: send unknown roles to workspace entry.
  return WORKSPACE_ENTRY_PATH;
}
