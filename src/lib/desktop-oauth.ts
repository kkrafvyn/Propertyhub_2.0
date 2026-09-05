export const DESKTOP_OAUTH_REDIRECT_URL = "baytmiftah://auth/callback";

type DesktopOAuthCallbackPayload =
  | { type: "code"; code: string }
  | { type: "session"; access_token: string; refresh_token: string }
  | { access_token: string; refresh_token: string };

type DesktopAPI = {
  openExternal?: (url: string) => Promise<void>;
  onOAuthCallback?: (callback: (session: DesktopOAuthCallbackPayload) => void) => () => void;
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

export function subscribeDesktopOAuthCallback(callback: (session: DesktopOAuthCallbackPayload) => void) {
  const api = getDesktopAPI();
  if (!api?.onOAuthCallback) return () => undefined;
  return api.onOAuthCallback(callback);
}
