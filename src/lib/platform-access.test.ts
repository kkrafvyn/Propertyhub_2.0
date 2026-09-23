import { describe, expect, it } from "vitest";
import {
  canAccessAdminSection,
  canAccessRevenueAdmin,
  canManagePlatformRoles,
  getPlatformGrants,
  hasPlatformConsoleAccess,
  resolvePlatformConsoleRole,
} from "./platform-access";
import { PLATFORM_CONSOLE_GRANTS } from "./platform-console-grants";

describe("platform-access", () => {
  it("reserves global operations telemetry for platform admins", () => {
    expect(canAccessAdminSection({ is_platform_admin: true }, "operations")).toBe(true);
    expect(canAccessAdminSection({ platform_console_grants: Object.values(PLATFORM_CONSOLE_GRANTS) }, "operations")).toBe(false);
  });
  it("resolves admin over explicit grants", () => {
    expect(
      resolvePlatformConsoleRole({
        is_platform_admin: true,
        platform_console_grants: [PLATFORM_CONSOLE_GRANTS.trust],
      }),
    ).toBe("admin");
  });

  it("allows delegate console access from selected grants", () => {
    expect(hasPlatformConsoleAccess({ platform_console_grants: [PLATFORM_CONSOLE_GRANTS.trust] })).toBe(
      true,
    );
    expect(canManagePlatformRoles({ platform_console_grants: [PLATFORM_CONSOLE_GRANTS.trust] })).toBe(
      false,
    );
    expect(canAccessRevenueAdmin({ platform_console_grants: [PLATFORM_CONSOLE_GRANTS.trust] })).toBe(
      false,
    );
  });

  it("grants full powers to platform admin", () => {
    expect(canManagePlatformRoles({ is_platform_admin: true })).toBe(true);
    expect(canAccessRevenueAdmin({ is_platform_admin: true })).toBe(true);
    expect(canAccessAdminSection({ is_platform_admin: true }, "settings")).toBe(true);
  });

  it("limits sections to assigned grants", () => {
    const profile = { platform_console_grants: [PLATFORM_CONSOLE_GRANTS.moderation] };
    expect(canAccessAdminSection(profile, "moderation")).toBe(true);
    expect(canAccessAdminSection(profile, "users")).toBe(false);
    expect(getPlatformGrants(profile)).toEqual([PLATFORM_CONSOLE_GRANTS.moderation]);
  });

  it("keeps legacy manager flag as full operations bundle", () => {
    expect(getPlatformGrants({ is_platform_manager: true })).toContain(PLATFORM_CONSOLE_GRANTS.users);
    expect(getPlatformGrants({ is_platform_manager: true })).not.toContain(PLATFORM_CONSOLE_GRANTS.revenue);
  });
});
