import type { User } from "@supabase/supabase-js";
import {
  getMetadataRole,
  isProfessionalRole,
  isWorkspaceRole,
} from "../app/lib/baytmiftah/roles";
import { hasPlatformConsoleAccess, type PlatformAccessFlags } from "./platform-access";

export const DESKTOP_GATEWAY_PATH = "/workspace/desktop";

const DESKTOP_PROMPT_KEY_PREFIX = "bm_desktop_prompt_seen_";
const DESKTOP_PROTOCOL = "baytmiftah://open";

const BUSINESS_ROLE_ALIASES = new Set([
  "host",
  "agent",
  "manager",
  "owner",
  "landlord",
  "agency",
  "property_manager",
  "property_owner",
  "independent_agent",
  "agency_agent",
  "agency_manager",
  "agency_owner",
  "enterprise_operator",
  "developer",
]);

type AuthUser = User | { id?: string; user_metadata?: unknown; app_metadata?: unknown } | null;

type AuthProfile = PlatformAccessFlags & { role?: string } | null;

function getAccountType(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const record = metadata as Record<string, unknown>;
  if (typeof record.account_type === "string") return record.account_type;
  if (typeof record.accountType === "string") return record.accountType;
  return undefined;
}

export function getDesktopPromptStorageKey(userId: string) {
  return `${DESKTOP_PROMPT_KEY_PREFIX}${userId}`;
}

export function hasSeenDesktopPrompt(userId: string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(getDesktopPromptStorageKey(userId)) === "true";
}

export function markDesktopPromptSeen(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getDesktopPromptStorageKey(userId), "true");
}

export function clearDesktopPromptSeen(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getDesktopPromptStorageKey(userId));
}

/** Business/professional users who may use workspace + desktop (not consumers, not platform staff). */
export function isBusinessWebUser(user: AuthUser, profile: AuthProfile) {
  if (!user) return false;
  if (hasPlatformConsoleAccess(profile)) return false;

  // Only server-controlled claims may classify a professional account.
  // Metadata supplied through auth.updateUser() must never grant privileges.
  const metadataRole = getMetadataRole(user.app_metadata);
  const role = metadataRole || profile?.role;
  const accountType = getAccountType(user.app_metadata);

  if (accountType === "landlord") return true;
  if (isWorkspaceRole(role) || isProfessionalRole(role)) return true;
  if (role && BUSINESS_ROLE_ALIASES.has(role)) return true;

  return false;
}

export function shouldOfferDesktopGateway(user: AuthUser, profile: AuthProfile) {
  if (!user?.id) return false;
  if (typeof window === "undefined") return false;
  if (!isBusinessWebUser(user, profile)) return false;
  return !hasSeenDesktopPrompt(user.id);
}

export function resolveBusinessWebHome(
  user: AuthUser,
  profile: AuthProfile,
  options?: { forceGateway?: boolean },
) {
  if (!isBusinessWebUser(user, profile)) {
    return "/app";
  }

  if (options?.forceGateway || shouldOfferDesktopGateway(user, profile)) {
    return DESKTOP_GATEWAY_PATH;
  }

  return "/workspace";
}

export function getDesktopDownloadUrl() {
  const configured = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL?.trim();
  if (configured) return configured;
  return "/downloads/baytmiftah-desktop-setup.exe";
}

export function getDesktopDeepLink() {
  return DESKTOP_PROTOCOL;
}

export function openBaytMiftahDesktop() {
  if (typeof window === "undefined") return;
  window.location.href = getDesktopDeepLink();
}

export const DESKTOP_GATEWAY_FEATURES = [
  { title: "Properties", description: "Portfolio, units, and occupancy" },
  { title: "Finance", description: "Invoices, payments, and reconciliation" },
  { title: "Maintenance", description: "Work orders, vendors, and SLAs" },
  { title: "Leasing & CRM", description: "Leads, applications, and leases" },
  { title: "Team", description: "Roles, assignments, and coordination" },
  { title: "Reports", description: "Performance and operational analytics" },
  { title: "AI & Automation", description: "Command center and workflows" },
  { title: "Operations", description: "Procurement and bulk operations" },
] as const;
