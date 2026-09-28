export const DESKTOP_OAUTH_REDIRECT_URL = "baytmiftah://auth/callback";
const DESKTOP_OAUTH_STATE_KEY = "bm_desktop_oauth_state";
const DESKTOP_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type DesktopOAuthCallbackPayload = { type: "code"; code: string; state: string };

type OAuthStateStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getOAuthStateStorage(): OAuthStateStorage {
  if (typeof window === "undefined") throw new Error("Desktop OAuth requires a browser session");
  return window.sessionStorage;
}

export function createDesktopOAuthState(
  storage: OAuthStateStorage = getOAuthStateStorage(),
  now = Date.now(),
) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  storage.setItem(DESKTOP_OAUTH_STATE_KEY, JSON.stringify({ state, createdAt: now }));
  return state;
}

export function consumeDesktopOAuthState(
  returnedState: string,
  storage: OAuthStateStorage = getOAuthStateStorage(),
  now = Date.now(),
) {
  const stored = storage.getItem(DESKTOP_OAUTH_STATE_KEY);
  storage.removeItem(DESKTOP_OAUTH_STATE_KEY);
  if (!stored || !returnedState) return false;
  try {
    const expected = JSON.parse(stored) as { state?: unknown; createdAt?: unknown };
    return typeof expected.state === "string"
      && typeof expected.createdAt === "number"
      && now - expected.createdAt >= 0
      && now - expected.createdAt <= DESKTOP_OAUTH_STATE_TTL_MS
      && expected.state === returnedState;
  } catch {
    return false;
  }
}

export function parseDesktopOAuthCallback(payload: unknown): DesktopOAuthCallbackPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (value.type !== "code" || typeof value.code !== "string" || !value.code.trim()) return null;
  if (typeof value.state !== "string" || !value.state.trim()) return null;
  if ("access_token" in value || "refresh_token" in value) return null;
  return { type: "code", code: value.code, state: value.state.trim() };
}

type DesktopAPI = {
  openExternal?: (url: string) => Promise<void>;
  onOAuthCallback?: (callback: (payload: unknown) => void) => () => void;
};

export function getDesktopOAuthRedirectUrl() {
  const state = createDesktopOAuthState();
  return `${DESKTOP_OAUTH_REDIRECT_URL}?bm_state=${encodeURIComponent(state)}`;
}

export function isDesktopOAuthRuntime() {
  if (typeof window === "undefined") return false;
  return Boolean(window.__ELECTRON__ || window.__BAYTMIFTAH_DESKTOP__);
}

export function getDesktopAPI(): DesktopAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { desktopAPI?: DesktopAPI }).desktopAPI;
}

export function subscribeDesktopOAuthCallback(callback: (payload: unknown) => void) {
  const api = getDesktopAPI();
  if (!api?.onOAuthCallback) return () => undefined;
  return api.onOAuthCallback(callback);
}
