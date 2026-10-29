import { isMarketingSite } from "./site-mode";

const DEFAULT_APP_ORIGIN = "https://app.baytmiftah.com";
const DEFAULT_MARKETING_ORIGIN = "https://baytmiftah.com";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function getMarketingOrigin(): string {
  return trimTrailingSlash(import.meta.env.VITE_SITE_URL || DEFAULT_MARKETING_ORIGIN);
}

export function getAppOrigin(): string {
  return trimTrailingSlash(
    import.meta.env.VITE_APP_ORIGIN ||
      import.meta.env.VITE_PUBLIC_APP_URL ||
      import.meta.env.VERCEL_PUBLIC_APP_URL ||
      DEFAULT_APP_ORIGIN,
  );
}

/**
 * Product-app URL for CTAs from the marketing site (app.baytmiftah.com).
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
