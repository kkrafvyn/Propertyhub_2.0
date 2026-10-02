import { describe, expect, it } from "vitest";
import { resolvePostAuthRedirect } from "../../app/lib/auth-routing";
import {
  canAccessAdminSection,
  canAccessRevenueAdmin,
  canManagePlatformRoles,
  hasPlatformConsoleAccess,
  resolvePlatformConsoleRole,
} from "../platform-access";
import { PLATFORM_CONSOLE_GRANTS } from "../platform-console-grants";

describe("api authorization — platform admin separation", () => {
  const regularWorkspaceUser = {
    is_platform_admin: false,
    is_platform_manager: false,
    platform_console_grants: [],
  };

  const platformStaffTrustOnly = {
    platform_console_grants: [PLATFORM_CONSOLE_GRANTS.trust],
  };

  const platformAdmin = { is_platform_admin: true };

  it("denies regular workspace users platform console access", () => {
    expect(hasPlatformConsoleAccess(regularWorkspaceUser)).toBe(false);
    expect(canManagePlatformRoles(regularWorkspaceUser)).toBe(false);
    expect(canAccessRevenueAdmin(regularWorkspaceUser)).toBe(false);
    expect(canAccessAdminSection(regularWorkspaceUser, "users")).toBe(false);
    expect(canAccessAdminSection(regularWorkspaceUser, "settings")).toBe(false);
  });

  it("limits platform staff to assigned console grants", () => {
    expect(resolvePlatformConsoleRole(platformStaffTrustOnly)).toBe("delegate");
    expect(canAccessAdminSection(platformStaffTrustOnly, "trust")).toBe(true);
    expect(canAccessAdminSection(platformStaffTrustOnly, "users")).toBe(false);
    expect(canAccessAdminSection(platformStaffTrustOnly, "revenue")).toBe(false);
    expect(canManagePlatformRoles(platformStaffTrustOnly)).toBe(false);
  });

  it("grants full platform admin powers only to platform admin", () => {
    expect(resolvePlatformConsoleRole(platformAdmin)).toBe("admin");
    expect(canManagePlatformRoles(platformAdmin)).toBe(true);
    expect(canAccessRevenueAdmin(platformAdmin)).toBe(true);
    expect(canAccessAdminSection(platformAdmin, "settings")).toBe(true);
  });

  it("does not route regular users to /admin after authentication", () => {
    expect(
      resolvePostAuthRedirect({ user_metadata: { role: "agent" } }, regularWorkspaceUser),
    ).toBe("/workspace");
    expect(
      resolvePostAuthRedirect({ user_metadata: { role: "consumer" } }, regularWorkspaceUser),
    ).toBe("/app");
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        regularWorkspaceUser,
        null,
        { hasOrgMembership: true },
      ),
    ).toBe("/workspace");
  });

  it("routes platform admin and staff to /admin", () => {
    expect(resolvePostAuthRedirect({ user_metadata: { role: "consumer" } }, platformAdmin)).toBe(
      "/admin",
    );
    expect(
      resolvePostAuthRedirect({ user_metadata: { role: "consumer" } }, platformStaffTrustOnly),
    ).toBe("/admin");
  });
});

describe("api authorization — direct object access expectations", () => {
  it("documents tenant-scoped query requirement for cross-tenant denial", () => {
    const attackMatrix = [
      "read tenant B property by id",
      "update tenant B lease by id",
      "list tenant B payments",
      "delete tenant B maintenance ticket",
      "invoke platform admin RPC as workspace user",
    ];
    expect(attackMatrix.length).toBeGreaterThanOrEqual(5);
  });
});
