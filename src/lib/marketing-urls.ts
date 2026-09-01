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

export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppOrigin()}${normalized}`;
}

export function marketingPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getMarketingOrigin()}${normalized}`;
}
