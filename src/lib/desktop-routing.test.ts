import { describe, expect, it } from "vitest";
import {
  isDesktopAuthRoute,
  isDesktopConsumerOnlyRoute,
  resolveDesktopProfessionalHome,
} from "./desktop-routing";

describe("desktop routing", () => {
  it("treats workspace and admin routes as professional", () => {
    expect(isDesktopConsumerOnlyRoute("/workspace")).toBe(false);
    expect(isDesktopConsumerOnlyRoute("/workspace/acme/properties")).toBe(false);
    expect(isDesktopConsumerOnlyRoute("/admin")).toBe(false);
    expect(isDesktopConsumerOnlyRoute("/admin/users")).toBe(false);
  });

  it("allows the protected security screen for workspace MFA without opening consumer routes", () => {
    expect(isDesktopConsumerOnlyRoute("/app/security")).toBe(false);
    expect(isDesktopConsumerOnlyRoute("/app")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/app/security-other")).toBe(true);
  });

  it("treats auth routes as allowed entry points", () => {
    expect(isDesktopAuthRoute("/login")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/login")).toBe(false);
    expect(isDesktopConsumerOnlyRoute("/signup")).toBe(false);
  });

  it("blocks consumer and marketing routes on desktop", () => {
    expect(isDesktopConsumerOnlyRoute("/")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/app")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/search")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/property/123")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/marketing")).toBe(true);
    expect(isDesktopConsumerOnlyRoute("/about")).toBe(true);
  });

  it("sends business users to workspace entry", () => {
    expect(
      resolveDesktopProfessionalHome(
        { user_metadata: { role: "host" } } as never,
        null,
      ),
    ).toBe("/workspace");
  });

  it("sends platform admins to admin console", () => {
    expect(
      resolveDesktopProfessionalHome(
        { user_metadata: { role: "consumer" } } as never,
        { is_platform_admin: true },
      ),
    ).toBe("/admin");
  });

  it("defers consumer rejection until profile is loaded", () => {
    expect(
      resolveDesktopProfessionalHome(
        { user_metadata: { role: "consumer" } } as never,
        null,
      ),
    ).toBe("/workspace");
  });

  it("rejects consumer accounts on desktop once profile is known", () => {
    expect(
      resolveDesktopProfessionalHome(
        { user_metadata: { role: "consumer" } } as never,
        { role: "consumer" },
      ),
    ).toBe("/login?reason=business-only");
  });
});
