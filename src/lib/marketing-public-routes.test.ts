import { describe, expect, it } from "vitest";
import { isMarketingPublicPath } from "./site-mode";

/** Mirrors Root.tsx shouldSkipOnboarding marketing exemption. */
function shouldSkipOnboarding(pathname: string) {
  if (pathname === "/") return true;
  if (isMarketingPublicPath(pathname)) return true;
  return pathname.startsWith("/login") || pathname.startsWith("/signup");
}

describe("marketing public onboarding exemption", () => {
  it("skips location onboarding for marketing homepage paths", () => {
    expect(shouldSkipOnboarding("/")).toBe(true);
    expect(shouldSkipOnboarding("/marketing")).toBe(true);
  });

  it("preserves marketing anchor chapter ids", () => {
    expect(isMarketingPublicPath("/about")).toBe(true);
    expect(isMarketingPublicPath("/help")).toBe(true);
  });

  it("does not skip onboarding for arbitrary app routes", () => {
    expect(shouldSkipOnboarding("/app/dashboard")).toBe(false);
  });
});
