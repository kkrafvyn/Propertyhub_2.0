import { describe, expect, it } from "vitest";
import { resolveLegacyRedirect, CONSUMER_ROUTES } from "./consumer-routes";

describe("resolveLegacyRedirect", () => {
  it("redirects exact legacy paths to canonical consumer routes", () => {
    expect(resolveLegacyRedirect("/explore")).toBe(CONSUMER_ROUTES.search);
    expect(resolveLegacyRedirect("/saved")).toBe(CONSUMER_ROUTES.saved);
    expect(resolveLegacyRedirect("/consumer/invest")).toBe(CONSUMER_ROUTES.profile);
  });

  it("redirects legacy prefixes to workspace or consumer hubs", () => {
    expect(resolveLegacyRedirect("/investment/offers")).toBe(CONSUMER_ROUTES.profile);
    expect(resolveLegacyRedirect("/agent/pipeline")).toBe(CONSUMER_ROUTES.workspace);
    expect(resolveLegacyRedirect("/renter/payments")).toBe(CONSUMER_ROUTES.payments);
  });

  it("falls back to home for unknown legacy paths", () => {
    expect(resolveLegacyRedirect("/unknown-legacy-path")).toBe(CONSUMER_ROUTES.home);
  });
});
