import { describe, expect, it } from "vitest";
import {
  accountTypeToAppRole,
  resolvePostAuthRedirect,
  sanitizePostAuthRedirectPath,
} from "./auth-routing";

describe("resolvePostAuthRedirect", () => {
  it("honours an explicit non-default redirect", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        null,
        "/app/saved",
      ),
    ).toBe("/app/saved");
  });

  it("sends platform admins to the admin console", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        { is_platform_admin: true },
      ),
    ).toBe("/admin");

    expect(
      resolvePostAuthRedirect(
        { app_metadata: { role: "platform_admin" } },
        null,
      ),
    ).toBe("/admin");
  });

  it("sends platform managers to the admin console", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        { is_platform_manager: true },
      ),
    ).toBe("/admin");
  });

  it("never treats an editable host, agent or admin claim as approved access", () => {
    for (const role of ["host", "agent", "agency_manager", "independent_agent", "platform_admin"]) {
      expect(resolvePostAuthRedirect({ user_metadata: { role } }, null)).toBe("/app");
    }
    // Even a trusted historic host role is not proof of current membership.
    expect(resolvePostAuthRedirect({ app_metadata: { role: "host" } }, null)).toBe("/app");
  });

  it("opens workspace only when organization membership is confirmed", () => {
    expect(resolvePostAuthRedirect(
      { user_metadata: { role: "consumer" } },
      null, null, { hasOrgMembership: true },
    )).toBe("/workspace");
  });

  it("defaults consumers to /app", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        null,
      ),
    ).toBe("/app");
  });

  it("prefers organization membership over stale consumer metadata", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        null,
        null,
        { hasOrgMembership: true },
      ),
    ).toBe("/workspace");
  });
});

describe("sanitizePostAuthRedirectPath", () => {
  it("allows in-app relative paths", () => {
    expect(sanitizePostAuthRedirectPath("/app/saved")).toBe("/app/saved");
    expect(sanitizePostAuthRedirectPath("/workspace/acme?tab=team")).toBe("/workspace/acme?tab=team");
  });

  it("blocks open redirects", () => {
    expect(sanitizePostAuthRedirectPath("https://evil.test")).toBeNull();
    expect(sanitizePostAuthRedirectPath("//evil.test/path")).toBeNull();
    expect(sanitizePostAuthRedirectPath("/\\evil")).toBeNull();
  });
});

describe("accountTypeToAppRole", () => {
  it("maps landlord signups to host", () => {
    expect(accountTypeToAppRole("landlord")).toBe("host");
  });

  it("maps user signups to consumer", () => {
    expect(accountTypeToAppRole("user")).toBe("consumer");
  });
});
