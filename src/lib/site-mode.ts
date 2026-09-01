/**
 * Distinguishes the public marketing site (baytmiftah.com)
 * from the product application (app.baytmiftah.com).
 */

export type SiteMode = "marketing" | "app";

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

/** Hostnames that should render the public marketing site (not the consumer app home). */
function isMarketingHostname(host: string): boolean {
  if (host === "baytmiftah.com") {
    return true;
  }

  if (host === "marketing.baytmiftah.com") {
    return true;
  }

  // Vercel project: baytmiftah-marketing (*.vercel.app preview + production URLs)
  if (host.includes("baytmiftah-marketing")) {
    return true;
  }

  return false;
}

export function resolveSiteMode(hostname?: string): SiteMode {
  const forced = import.meta.env.VITE_SITE_MODE?.trim().toLowerCase();
  if (forced === "marketing" || forced === "app") {
    return forced;
  }

  const host = normalizeHost(
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : ""),
  );

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "app";
  }

  if (host.startsWith("app.")) {
    return "app";
  }

  if (isMarketingHostname(host)) {
    return "marketing";
  }

  return "app";
}

export function isMarketingSite(hostname?: string): boolean {
  return resolveSiteMode(hostname) === "marketing";
}

export function isAppSite(hostname?: string): boolean {
  return resolveSiteMode(hostname) === "app";
}

const MARKETING_PUBLIC_PREFIXES = [
  "/about",
  "/careers",
  "/contact",
  "/help",
  "/cancellation",
  "/explorer",
  "/privacy",
  "/terms",
  "/legal",
  "/complaint",
] as const;

/** Paths served on the marketing site (baytmiftah.com) with marketing chrome. */
export function isMarketingPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  if (path === "/") return true;
  return MARKETING_PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
