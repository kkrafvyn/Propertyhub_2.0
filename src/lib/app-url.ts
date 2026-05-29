export const PRODUCTION_APP_URL = "https://baytmiftah-krafvyn.vercel.app";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeBaseUrl(candidate?: string | null) {
  if (!candidate) return null;

  try {
    const withProtocol = candidate.startsWith("http") ? candidate : `https://${candidate}`;
    const url = new URL(withProtocol);

    if (LOCAL_HOSTS.has(url.hostname)) return null;

    url.pathname = "";
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getPublicAppBaseUrl() {
  const configuredUrl = normalizeBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL);

  if (configuredUrl) return configuredUrl;

  if (typeof window !== "undefined") {
    const browserUrl = normalizeBaseUrl(window.location.origin);

    if (browserUrl) return browserUrl;
  }

  return PRODUCTION_APP_URL;
}

export function buildPublicAppUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getPublicAppBaseUrl()}${normalizedPath}`;
}

export function resolveInternalRedirectPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  try {
    const url = new URL(trimmed, PRODUCTION_APP_URL);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
