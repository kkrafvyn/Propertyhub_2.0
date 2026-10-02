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
        { user_metadata: { role: "platform_admin" } },
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

  it("sends workspace roles to /workspace", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "host" } },
        null,
      ),
    ).toBe("/workspace");

    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "agent" } },
        null,
      ),
    ).toBe("/workspace");

    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "agency_manager" } },
        null,
      ),
    ).toBe("/workspace");

    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "independent_agent" } },
        null,
      ),
    ).toBe("/workspace");
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
