export type MobilePlatform = "ios" | "android";

export interface AppVersionSnapshot {
  latest_version: string;
  minimum_version: string;
  update_url: string;
  force_update: boolean;
  current_version?: string;
}

const FALLBACK_VERSIONS: Record<MobilePlatform, AppVersionSnapshot> = {
  ios: {
    latest_version: "1.0.0",
    minimum_version: "1.0.0",
    update_url: "https://apps.apple.com/app/baytmiftah",
    force_update: false,
  },
  android: {
    latest_version: "1.0.0",
    minimum_version: "1.0.0",
    update_url: "https://play.google.com/store/apps/details?id=com.baytmiftah.app",
    force_update: false,
  },
};

function createBrowserDeviceId() {
  if (typeof window === "undefined") return "server-device";

  const key = "baytmiftah_browser_device_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    globalThis.crypto?.randomUUID?.() ||
    `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export const mobileAppService = {
  async getAppVersion(platform: MobilePlatform) {
    return FALLBACK_VERSIONS[platform];
  },

  getBrowserDeviceId() {
    return createBrowserDeviceId();
  },

  async registerDevice(
    userId: string,
    deviceId: string,
    platform: string,
    appVersion: string,
    osVersion: string
  ) {
    return {
      id: deviceId,
      user_id: userId,
      platform,
      app_version: appVersion,
      os_version: osVersion,
      registered_at: new Date().toISOString(),
    };
  },

  async subscribeToPushNotifications(
    deviceId: string,
    endpoint: string,
    metadata: Record<string, unknown> = {}
  ) {
    return {
      id: `${deviceId}:${endpoint}`,
      device_id: deviceId,
      endpoint,
      metadata,
      subscribed_at: new Date().toISOString(),
    };
  },
};
