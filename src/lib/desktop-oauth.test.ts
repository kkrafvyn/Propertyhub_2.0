import { describe, expect, it } from "vitest";
import {
  consumeDesktopOAuthState,
  createDesktopOAuthState,
  parseDesktopOAuthCallback,
} from "./desktop-oauth";

describe("desktop OAuth callback validation", () => {
  it("accepts a non-empty authorization code", () => {
    expect(parseDesktopOAuthCallback({ type: "code", code: "one-time-code", state: "nonce-123" })).toEqual({
      type: "code",
      code: "one-time-code",
      state: "nonce-123",
    });
  });

  it("rejects bearer tokens and malformed callbacks", () => {
    expect(parseDesktopOAuthCallback({ access_token: "access", refresh_token: "refresh" })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "session", access_token: "access", refresh_token: "refresh" })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "code", code: "  " })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "code", code: "short", state: "   " })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "code", code: "short" })).toBeNull();
    expect(parseDesktopOAuthCallback(null)).toBeNull();
  });

  it("accepts a correlated state once and rejects mismatched, missing, expired, or replayed state", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };
    const state = createDesktopOAuthState(storage, 1000);
    expect(consumeDesktopOAuthState("wrong-state", storage, 1001)).toBe(false);
    expect(consumeDesktopOAuthState(state, storage, 1001)).toBe(false);

    const nextState = createDesktopOAuthState(storage, 1000);
    expect(consumeDesktopOAuthState(nextState, storage, 1001)).toBe(true);
    expect(consumeDesktopOAuthState(nextState, storage, 1002)).toBe(false);

    const expiredState = createDesktopOAuthState(storage, 1000);
    expect(consumeDesktopOAuthState(expiredState, storage, 601001)).toBe(false);
  });

  it("accepts code callbacks only with non-empty state and rejects bearer tokens", () => {
    expect(parseDesktopOAuthCallback({ type: "code", code: "1234567890abcdef", state: "nonce-123" })).toEqual({
      type: "code",
      code: "1234567890abcdef",
      state: "nonce-123",
    });

    expect(parseDesktopOAuthCallback({ type: "code", code: "1234567890abcdef", state: "" })).toBeNull();
    expect(parseDesktopOAuthCallback({ type: "code", code: "1234567890abcdef", state: "   " })).toBeNull();
  });
});