import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: {
    open: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
  },
}));

import { Capacitor } from "@capacitor/core";
import {
  consumeNativeOAuthState,
  createNativeOAuthState,
  getNativeOAuthRedirectUrl,
  isNativeOAuthRuntime,
  parseNativeOAuthCallbackUrl,
} from "./native-oauth";

describe("native-oauth", () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("uses a consumer-specific callback URL with one-time state", () => {
    const url = new URL(getNativeOAuthRedirectUrl());
    expect(url.protocol).toBe("com.baymiftah.app:");
    expect(url.hostname).toBe("auth");
    expect(url.searchParams.get("bm_state")).toHaveLength(64);
  });

  it("detects native runtime via Capacitor", () => {
    expect(isNativeOAuthRuntime()).toBe(false);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNativeOAuthRuntime()).toBe(true);
  });

  it("parses a state-bound authorization code from query string", () => {
    expect(parseNativeOAuthCallbackUrl("com.baymiftah.app://auth/callback?code=abc123&bm_state=state")).toEqual({
      type: "code",
      code: "abc123",
      state: "state",
    });
  });

  it("rejects token-bearing callbacks and consumes state once", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const state = createNativeOAuthState(storage, 1_000);
    expect(consumeNativeOAuthState(state, storage, 1_001)).toBe(true);
    expect(consumeNativeOAuthState(state, storage, 1_002)).toBe(false);
    expect(parseNativeOAuthCallbackUrl("com.baymiftah.app://auth/callback?access_token=at&refresh_token=rt")).toBeNull();
  });

  it("rejects non-auth or incomplete callbacks", () => {
    expect(parseNativeOAuthCallbackUrl("https://example.com/callback?code=x")).toBeNull();
    expect(parseNativeOAuthCallbackUrl("com.baymiftah.workspace://auth/callback?code=x&bm_state=s")).toBeNull();
    expect(parseNativeOAuthCallbackUrl("com.baymiftah.app://auth/callback?access_token=only")).toBeNull();
  });
});
