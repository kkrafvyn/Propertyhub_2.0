const APP_HOSTS = new Set(["propertyhub.app", "www.propertyhub.app", "propertyhub.example"]);
const ALLOWED_PREFIXES = [
  "/",
  "/search",
  "/property/",
  "/agencies",
  "/guides",
  "/market-trends",
  "/reviews",
  "/buyer-requests",
  "/projects",
  "/valuation",
  "/get-the-app",
  "/app",
  "/workspace",
  "/login",
  "/signup",
];

function isAllowedPath(pathname: string) {
  return ALLOWED_PREFIXES.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export const mobileDeepLinkService = {
  toAppPath(input?: string | null) {
    if (!input) return "/";

    try {
      if (input.startsWith("/")) {
        const url = new URL(input, "https://propertyhub.app");
        return isAllowedPath(url.pathname) ? input : "/";
      }

      const url = new URL(input);
      if (url.protocol === "propertyhub:" || url.protocol === "property-hub:") {
        const pathname = url.host ? `/${url.host}${url.pathname || ""}` : url.pathname || "/";
        const route = `${pathname}${url.search || ""}${url.hash || ""}`;
        return isAllowedPath(pathname) ? route : "/";
      }

      const pathname = url.pathname || "/";
      const route = `${pathname}${url.search || ""}${url.hash || ""}`;

      if (url.protocol === "https:" && APP_HOSTS.has(url.host)) {
        return isAllowedPath(pathname) ? route : "/";
      }

      return "/";
    } catch {
      return "/";
    }
  },
};
