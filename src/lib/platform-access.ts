import {
  normalizePlatformGrants,
  PLATFORM_CONSOLE_GRANTS,
  PLATFORM_OPERATIONS_GRANTS,
  type PlatformConsoleGrant,
} from "./platform-console-grants";

export type PlatformConsoleRole = "none" | "delegate" | "admin";

export type PlatformAccessFlags = {
  is_platform_admin?: boolean | null;
  is_platform_manager?: boolean | null;
  platform_console_grants?: string[] | null;
};

export type AdminConsoleSection =
  | "operations"
  | "overview"
  | "users"
  | "organizations"
  | "listings"
  | "moderation"
  | "fraud"
  | "trust"
  | "support"
  | "settings"
  | "revenue";

const SECTION_GRANT_MAP: Record<Exclude<AdminConsoleSection, "overview" | "operations">, PlatformConsoleGrant> = {
  users: PLATFORM_CONSOLE_GRANTS.users,
  organizations: PLATFORM_CONSOLE_GRANTS.organizations,
  listings: PLATFORM_CONSOLE_GRANTS.listings,
  moderation: PLATFORM_CONSOLE_GRANTS.moderation,
  fraud: PLATFORM_CONSOLE_GRANTS.moderation,
  trust: PLATFORM_CONSOLE_GRANTS.trust,
  support: PLATFORM_CONSOLE_GRANTS.support,
  revenue: PLATFORM_CONSOLE_GRANTS.revenue,
  settings: PLATFORM_CONSOLE_GRANTS.settings,
};

export function getPlatformGrants(
  profile: PlatformAccessFlags | null | undefined,
): PlatformConsoleGrant[] {
  if (profile?.is_platform_admin) {
    return Object.values(PLATFORM_CONSOLE_GRANTS);
  }

  const explicit = normalizePlatformGrants(profile?.platform_console_grants);
  if (explicit.length > 0) return explicit;

  if (profile?.is_platform_manager) {
    return [...PLATFORM_OPERATIONS_GRANTS];
  }

  return [];
}

export function resolvePlatformConsoleRole(
  profile: PlatformAccessFlags | null | undefined,
): PlatformConsoleRole {
  if (profile?.is_platform_admin) return "admin";
  if (getPlatformGrants(profile).length > 0) return "delegate";
  return "none";
}

export function hasPlatformConsoleAccess(profile: PlatformAccessFlags | null | undefined) {
  return resolvePlatformConsoleRole(profile) !== "none";
}

export function hasConsoleGrant(
  profile: PlatformAccessFlags | null | undefined,
  grant: PlatformConsoleGrant,
) {
  return getPlatformGrants(profile).includes(grant);
}

export function canAccessAdminSection(
  profile: PlatformAccessFlags | null | undefined,
  section: AdminConsoleSection,
) {
  if (!hasPlatformConsoleAccess(profile)) return false;
  if (section === "operations") return Boolean(profile?.is_platform_admin);
  if (section === "overview") return true;
  const grant = SECTION_GRANT_MAP[section];
  return hasConsoleGrant(profile, grant);
}

export function canManagePlatformRoles(profile: PlatformAccessFlags | null | undefined) {
  return resolvePlatformConsoleRole(profile) === "admin";
}

export function canAccessRevenueAdmin(profile: PlatformAccessFlags | null | undefined) {
  return hasConsoleGrant(profile, PLATFORM_CONSOLE_GRANTS.revenue);
}

export function platformRoleLabel(profile: PlatformAccessFlags | null | undefined) {
  const role = resolvePlatformConsoleRole(profile);
  switch (role) {
    case "admin":
      return "Platform Admin";
    case "delegate":
      return "Platform Staff";
    default:
      return "User";
  }
}
