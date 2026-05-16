import { describe, expect, it } from "vitest";
import { mobileDeepLinkService } from "./mobile-deep-link.service";

describe("mobileDeepLinkService", () => {
  it("normalizes trusted app and web URLs into internal routes", () => {
    expect(mobileDeepLinkService.toAppPath("baytmiftah://property/listing-1?from=push")).toBe(
      "/property/listing-1?from=push"
    );
    expect(mobileDeepLinkService.toAppPath("https://baytmiftah.app/app/deals#offer")).toBe(
      "/app/deals#offer"
    );
    expect(mobileDeepLinkService.toAppPath("/search?q=Labone")).toBe("/search?q=Labone");
  });

  it("falls back to home for unknown hosts or unsupported paths", () => {
    expect(mobileDeepLinkService.toAppPath("https://example.com/app/deals")).toBe("/");
    expect(mobileDeepLinkService.toAppPath("baytmiftah://admin/users")).toBe("/");
    expect(mobileDeepLinkService.toAppPath("not a url")).toBe("/");
  });
});
