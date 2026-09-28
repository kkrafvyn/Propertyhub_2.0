export const DESKTOP_OAUTH_REDIRECT_URL = "baytmiftah://auth/callback";

export type DesktopOAuthCallbackPayload = { type: "code"; code: string; state?: string };

export function parseDesktopOAuthCallback(payload: unknown): DesktopOAuthCallbackPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (value.type !== "code" || typeof value.code !== "string" || !value.code.trim()) return null;
  if ("state" in value && (typeof value.state !== "string" || !value.state.trim())) return null;
  if ("access_token" in value || "refresh_token" in value) return null;
  const result: DesktopOAuthCallbackPayload = { type: "code", code: value.code };
  if (typeof value.state === "string" && value.state.trim()) {
    result.state = value.state.trim();
  }
  return result;
}

type DesktopAPI = {
  openExternal?: (url: string) => Promise<void>;
  onOAuthCallback?: (callback: (payload: unknown) => void) => () => void;
};

export function getDesktopOAuthRedirectUrl() {
  return DESKTOP_OAUTH_REDIRECT_URL;
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
