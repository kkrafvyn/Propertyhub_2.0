const INSTALL_KEY = "baytmiftah_session_install_id";

/** Stable per-browser-install id; paired with auth session id when available. */
export function getOrCreateSessionInstallId(): string {
  if (typeof sessionStorage === "undefined") return crypto.randomUUID();
  let id = sessionStorage.getItem(INSTALL_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(INSTALL_KEY, id);
  }
  return id;
}

/** GoTrue JWT `session_id` claim when present. */
export function extractAuthSessionId(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const sessionId = payload.session_id ?? payload.sessionId;
    return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null;
  } catch {
    return null;
  }
}
