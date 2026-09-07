import { supabase } from "./supabase";
import { isElectron } from "./surface-detection";

export type AppUpdateSurface = "web" | "desktop" | "ios" | "android";

export type AppUpdateInfo = {
  update_available: boolean;
  force_update: boolean;
  current_version: string;
  latest_version: string;
  minimum_version: string;
  download_url: string | null;
  changelog: string | null;
};

const DISMISS_KEY = "bm_app_update_dismissed_version";

function currentAppVersion() {
  return (
    import.meta.env.VITE_APP_VERSION ||
    import.meta.env.VITE_APP_BUILD_NUMBER ||
    "0.0.1"
  );
}

function resolveSurface(): AppUpdateSurface {
  if (isElectron()) return "desktop";
  if (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    return "ios";
  }
  if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) {
    return "android";
  }
  return "web";
}

function parseVersion(version: string) {
  const [major, minor, patch] = version.split(".").map((part) => Number(part) || 0);
  return major * 10000 + minor * 100 + patch;
}

function envBasedUpdateInfo(surface: AppUpdateSurface, current: string): AppUpdateInfo {
  const latest =
    import.meta.env.VITE_APP_LATEST_VERSION ||
    import.meta.env.VITE_APP_VERSION ||
    current;
  const minimum =
    import.meta.env.VITE_APP_MINIMUM_VERSION ||
    import.meta.env.VITE_APP_MIN_VERSION ||
    current;

  return {
    update_available: parseVersion(latest) > parseVersion(current),
    force_update: import.meta.env.VITE_APP_FORCE_UPDATE === "true",
    current_version: current,
    latest_version: latest,
    minimum_version: minimum,
    download_url:
      surface === "desktop"
        ? import.meta.env.VITE_DESKTOP_DOWNLOAD_URL ||
          "/downloads/baytmiftah-desktop-setup.exe"
        : import.meta.env.VITE_PUBLIC_APP_URL || null,
    changelog: import.meta.env.VITE_APP_CHANGELOG || null,
  };
}

export const appUpdateService = {
  currentVersion: currentAppVersion,

  wasDismissed(latestVersion: string) {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(DISMISS_KEY) === latestVersion;
  },

  dismiss(latestVersion: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(DISMISS_KEY, latestVersion);
  },

  async checkForUpdates(surface = resolveSurface()): Promise<AppUpdateInfo> {
    const current = currentAppVersion();
    const preferLocal =
      import.meta.env.VITE_APP_UPDATE_SOURCE === "local" ||
      (import.meta.env.PROD &&
        import.meta.env.VITE_APP_LATEST_VERSION &&
        import.meta.env.VITE_APP_UPDATE_REMOTE !== "true");

    if (preferLocal) {
      return envBasedUpdateInfo(surface, current);
    }

    try {
      const { data, error } = await supabase.functions.invoke("app-version", {
        body: { surface, current },
      });

      if (error) throw error;

      const payload = data as AppUpdateInfo | null;
      if (payload?.latest_version) {
        return {
          update_available:
            payload.update_available ??
            parseVersion(payload.latest_version) > parseVersion(current),
          force_update: Boolean(payload.force_update),
          current_version: current,
          latest_version: payload.latest_version,
          minimum_version: payload.minimum_version || current,
          download_url: payload.download_url || null,
          changelog: payload.changelog || null,
        };
      }
    } catch {
      // Fall through to env-based check when edge function is unavailable.
    }

    return envBasedUpdateInfo(surface, current);
  },
};
