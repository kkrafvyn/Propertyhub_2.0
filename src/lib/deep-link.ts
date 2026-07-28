const LEGACY_PATH_MAP: Record<string, string> = {
  "/my-home": "/app",
  "/tenant": "/app/leases",
  "/renter": "/app/leases",
  "/buyer": "/app/applications",
  "/host": "/app/trips",
  "/resident": "/app/resident",
};

export function resolveDeepLinkPath(actionUrl?: string | null, fallback = "/app") {
  if (!actionUrl?.trim()) return fallback;

  const trimmed = actionUrl.trim();

  try {
    const resolved = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "https://baytmiftah.com");

    const mapped = LEGACY_PATH_MAP[resolved.pathname] || resolved.pathname;
    const next = `${mapped}${resolved.search}${resolved.hash}`;
    return next || fallback;
  } catch {
    if (trimmed.startsWith("/")) {
      return LEGACY_PATH_MAP[trimmed.split("?")[0]] || trimmed;
    }
    return fallback;
  }
}

export function mobileCaptureProps() {
  if (typeof window === "undefined") return {};

  const isMobile =
    window.matchMedia("(max-width: 767px)").matches || /Mobi|Android/i.test(navigator.userAgent);

  return isMobile ? { capture: "environment" as const } : {};
}
