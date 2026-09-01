import { isMarketingSite } from "./site-mode";

const DEFAULT_APP_ORIGIN = "https://app.baytmiftah.com";
const DEFAULT_MARKETING_ORIGIN = "https://baytmiftah.com";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function getMarketingOrigin(): string {
  return trimTrailingSlash(
    import.meta.env.VITE_SITE_URL ||
      import.meta.env.VITE_PUBLIC_APP_URL ||
      DEFAULT_MARKETING_ORIGIN,
  );
}

export function getAppOrigin(): string {
  return trimTrailingSlash(import.meta.env.VITE_APP_ORIGIN || DEFAULT_APP_ORIGIN);
}

/**
 * Product-app URL for CTAs from the marketing site.
 * Uses same-origin paths on marketing preview deploys; production uses app.baytmiftah.com.
 */
export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const appOrigin = getAppOrigin();

  if (typeof window !== "undefined" && isMarketingSite()) {
    const host = window.location.hostname.toLowerCase();
    const onPreviewHost = host.includes("vercel.app") || host === "localhost" || host === "127.0.0.1";
    const configuredAppOrigin = import.meta.env.VITE_APP_ORIGIN?.trim();

    if (onPreviewHost || !configuredAppOrigin || appOrigin === getMarketingOrigin()) {
      return normalized;
    }
  }

  return `${appOrigin}${normalized}`;
}

export function marketingPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getMarketingOrigin()}${normalized}`;
}
