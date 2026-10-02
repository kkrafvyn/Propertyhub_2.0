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

export type PostAuthRedirectContext = {
  /** When true, route to workspace even if JWT metadata still says consumer. */
  hasOrgMembership?: boolean;
};

/** Allow only same-origin relative in-app paths (blocks open redirects). */
export function sanitizePostAuthRedirectPath(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  if (/^https?:/i.test(trimmed) || trimmed.includes("@")) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith("//") || /^https?:/i.test(decoded)) {
      return null;
    }
  } catch {
    return null;
  }
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  if (!/^\/[\w./%-]*$/.test(pathOnly)) {
    return null;
  }
  return trimmed;
}

/** Resolve the dashboard for the shared web app after login. */
export function resolvePostAuthRedirect(
  user: AuthUser,
  profile: AuthProfile,
  explicitRedirect?: string | null,
  context?: PostAuthRedirectContext,
): string {
  const safeExplicit = sanitizePostAuthRedirectPath(explicitRedirect);

  if (!user) {
    if (typeof window !== "undefined" && isElectron()) {
      return safeExplicit || "/login";
    }
    return safeExplicit || "/app";
  }

  if (safeExplicit && safeExplicit !== "/app") {
    if (typeof window !== "undefined" && isElectron() && isDesktopConsumerOnlyRoute(safeExplicit)) {
      return resolveDesktopProfessionalHome(user as User, profile);
    }
    return safeExplicit;
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

  if (context?.hasOrgMembership) {
    return "/workspace";
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
