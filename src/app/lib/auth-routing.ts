import type { User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { getMobileAppId } from "../../lib/mobile-app";
import { isElectron } from "../../lib/surface-detection";
import { isDesktopConsumerOnlyRoute, resolveDesktopProfessionalHome } from "../../lib/desktop-routing";
import { getMetadataRole, isFullAdminRole, isWorkspaceRole } from "./baytmiftah/roles";
import { hasPlatformConsoleAccess } from "../../lib/platform-access";

type AuthUser = User | { user_metadata?: unknown; app_metadata?: unknown } | null;

type AuthProfile = {
  role?: string;
  is_platform_admin?: boolean;
  is_platform_manager?: boolean;
  platform_console_grants?: string[];
} | null;

/** Resolve the dashboard for the shared web app after login. */
export function resolvePostAuthRedirect(
  user: AuthUser,
  profile: AuthProfile,
  explicitRedirect?: string | null,
): string {
  if (!user) {
    if (typeof window !== "undefined" && isElectron()) {
      return explicitRedirect || "/login";
    }
    return explicitRedirect || "/app";
  }

  if (explicitRedirect && explicitRedirect !== "/app") {
    if (typeof window !== "undefined" && isElectron() && isDesktopConsumerOnlyRoute(explicitRedirect)) {
      return resolveDesktopProfessionalHome(user as User, profile);
    }
    return explicitRedirect;
  }

  const mobileApp = typeof window !== "undefined" ? getMobileAppId() : "consumer";
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();

  if (isNative && mobileApp === "business") {
    return "/workspace";
  }

  if (isNative && mobileApp === "consumer") {
    return "/";
  }

  const metadataRole = getMetadataRole(user.user_metadata) || getMetadataRole(user.app_metadata);

  if (typeof window !== "undefined" && isElectron()) {
    return resolveDesktopProfessionalHome(user as User, profile);
  }

  if (hasPlatformConsoleAccess(profile) || isFullAdminRole(metadataRole)) {
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
