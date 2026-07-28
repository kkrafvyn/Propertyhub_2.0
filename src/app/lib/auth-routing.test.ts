import { describe, expect, it } from "vitest";
import { accountTypeToAppRole, resolvePostAuthRedirect } from "./auth-routing";

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
  });

  it("defaults consumers to /app", () => {
    expect(
      resolvePostAuthRedirect(
        { user_metadata: { role: "consumer" } },
        null,
      ),
    ).toBe("/app");
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
