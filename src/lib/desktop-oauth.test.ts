import { describe, expect, it } from "vitest";
import { parseDesktopOAuthCallback } from "./desktop-oauth";

describe("desktop OAuth callback validation", () => {
  it("accepts a non-empty authorization code", () => {
    expect(parseDesktopOAuthCallback({ type: "code", code: "one-time-code" })).toEqual({
      type: "code",
      code: "one-time-code",
    });
  });

  it("rejects bearer tokens and malformed callbacks", () => {
    expect(parseDesktopOAuthCallback({ access_token: "access", refresh_token: "refresh" })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "session", access_token: "access", refresh_token: "refresh" })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "code", code: "  " })).toBeNull();
    expect(parseDesktopOAuthCallback(null)).toBeNull();
  });
});