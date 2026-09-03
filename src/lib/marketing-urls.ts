import { isMarketingSite } from "./site-mode";

/** Temporary default until app.baytmiftah.com is the primary product URL. */
const DEFAULT_APP_ORIGIN = "https://propertyhub-2-0-ecru.vercel.app";
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
  return trimTrailingSlash(
    import.meta.env.VITE_APP_ORIGIN ||
      import.meta.env.VERCEL_PUBLIC_APP_URL ||
      DEFAULT_APP_ORIGIN,
  );
}

/**
 * Product-app URL for CTAs from the marketing site.
 * Always points at the configured app origin (Vercel app for now).
 */
export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && !isMarketingSite()) {
    return normalized;
  }

  return `${getAppOrigin()}${normalized}`;
}

export function marketingPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getMarketingOrigin()}${normalized}`;
}
