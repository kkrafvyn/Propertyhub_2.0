import { Capacitor } from "@capacitor/core";
import { getMobileAppId } from "./mobile-app";

const NATIVE_OAUTH_STATE_KEY = "bm_native_oauth_state";
const NATIVE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type NativeOAuthCallbackPayload = { type: "code"; code: string; state: string };

type OAuthStateStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getOAuthStateStorage(): OAuthStateStorage {
  if (typeof window === "undefined") throw new Error("Native OAuth requires a browser session");
  return window.sessionStorage;
}

export function createNativeOAuthState(
  storage: OAuthStateStorage = getOAuthStateStorage(),
  now = Date.now(),
) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  storage.setItem(NATIVE_OAUTH_STATE_KEY, JSON.stringify({ state, createdAt: now }));
  return state;
}

export function consumeNativeOAuthState(
  returnedState: string,
  storage: OAuthStateStorage = getOAuthStateStorage(),
  now = Date.now(),
) {
  const stored = storage.getItem(NATIVE_OAUTH_STATE_KEY);
  storage.removeItem(NATIVE_OAUTH_STATE_KEY);
  if (!stored || !returnedState) return false;
  try {
    const expected = JSON.parse(stored) as { state?: unknown; createdAt?: unknown };
    return typeof expected.state === "string"
      && typeof expected.createdAt === "number"
      && now - expected.createdAt >= 0
      && now - expected.createdAt <= NATIVE_OAUTH_STATE_TTL_MS
      && expected.state === returnedState;
  } catch {
    return false;
  }
}

function getNativeOAuthCallbackBaseUrl() {
  return getMobileAppId() === "business"
    ? "com.baymiftah.workspace://auth/callback"
    : "com.baymiftah.app://auth/callback";
}

export function getNativeOAuthRedirectUrl() {
  const state = createNativeOAuthState();
  return `${getNativeOAuthCallbackBaseUrl()}?bm_state=${encodeURIComponent(state)}`;
}

export function isNativeOAuthRuntime() {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Parse the app-specific OAuth callback. Native apps accept authorization codes
 * only; token-bearing links are deliberately rejected to prevent session fixation.
 */
export function parseNativeOAuthCallbackUrl(url: string): NativeOAuthCallbackPayload | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const expected = new URL(getNativeOAuthCallbackBaseUrl());
    if (
      parsed.protocol !== expected.protocol ||
      parsed.hostname !== expected.hostname ||
      parsed.pathname !== expected.pathname
    ) return null;

    const code = parsed.searchParams.get("code")?.trim();
    const state = parsed.searchParams.get("bm_state")?.trim();
    if (!code || !state) return null;
    if (parsed.searchParams.has("access_token") || parsed.searchParams.has("refresh_token")) return null;
    return { type: "code", code, state };
  } catch {
    return null;
  }
}

export async function openNativeOAuthUrl(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

export async function closeNativeOAuthBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    // Browser may already be dismissed by the OS after the deep link.
  }
}

/**
 * Subscribe to Capacitor appUrlOpen events for OAuth deep links.
 * Returns an unsubscribe function.
 */
export function subscribeNativeOAuthCallback(
  callback: (session: NativeOAuthCallbackPayload) => void | Promise<void>,
): () => void {
  if (!isNativeOAuthRuntime()) return () => undefined;

  let remove: (() => void) | undefined;
  let cancelled = false;

  void (async () => {
    try {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        const payload = parseNativeOAuthCallbackUrl(url);
        if (!payload) return;
        void callback(payload);
      });
      if (cancelled) {
        void handle.remove();
        return;
      }
      remove = () => {
        void handle.remove();
      };
    } catch (err) {
      console.error("Failed to subscribe to native OAuth callbacks:", err);
    }
  })();

  return () => {
    cancelled = true;
    remove?.();
  };
}
