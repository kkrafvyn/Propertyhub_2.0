import { describe, expect, it } from "vitest";
import { mobileCaptureProps, resolveDeepLinkPath } from "./deep-link";

describe("resolveDeepLinkPath", () => {
  it("returns fallback for empty values", () => {
    expect(resolveDeepLinkPath(null, "/app")).toBe("/app");
    expect(resolveDeepLinkPath("", "/app/alerts")).toBe("/app/alerts");
  });

  it("normalizes app-relative paths", () => {
    expect(resolveDeepLinkPath("/app/messages?conversation=abc")).toBe(
      "/app/messages?conversation=abc"
    );
  });

  it("maps legacy consumer paths", () => {
    expect(resolveDeepLinkPath("/tenant")).toBe("/app/leases");
    expect(resolveDeepLinkPath("/buyer")).toBe("/app/applications");
  });

  it("extracts pathname from absolute URLs", () => {
    expect(resolveDeepLinkPath("https://baytmiftah.com/property/123")).toBe("/property/123");
  });
});

describe("mobileCaptureProps", () => {
  it("returns an object", () => {
    expect(typeof mobileCaptureProps()).toBe("object");
  });
});
