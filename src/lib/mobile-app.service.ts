import type { Database } from "./database.types";
import { supabase } from "./supabase";

export type MobilePlatform = "ios" | "android";

export interface AppVersionSnapshot {
  latest_version: string;
  minimum_version: string;
  update_url: string;
  force_update: boolean;
  current_version?: string;
}

type MobileDeviceRow = Database["public"]["Tables"]["mobile_devices"]["Row"];
type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];

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

function normalizeDevicePlatform(platform: string) {
  const normalized = String(platform || "").trim().toLowerCase();
  if (normalized === "ios" || normalized === "android" || normalized === "web") {
    return normalized;
  }

  return "web";
}

function serializeSubscriptionMetadata(metadata: Record<string, unknown>) {
  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

export const mobileAppService = {
  async getAppVersion(platform: MobilePlatform) {
    const { data, error } = await supabase
      .from("mobile_app_releases")
      .select("*")
      .eq("platform", platform)
      .maybeSingle();

    if (error) {
      console.warn(`Failed to load ${platform} app release metadata:`, error);
      return FALLBACK_VERSIONS[platform];
    }

    if (!data) {
      return FALLBACK_VERSIONS[platform];
    }

    return {
      latest_version: data.latest_version,
      minimum_version: data.minimum_version,
      update_url: data.update_url,
      force_update: data.force_update,
      current_version: data.current_version || undefined,
    } satisfies AppVersionSnapshot;
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
    const { data, error } = await supabase
      .from("mobile_devices")
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          device_type: normalizeDevicePlatform(platform),
          app_version: appVersion,
          os_version: osVersion,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "device_id" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return data as MobileDeviceRow;
  },

  async subscribeToPushNotifications(
    deviceId: string,
    endpoint: string,
    metadata: Record<string, unknown> = {}
  ) {
    const { data: existingSubscription, error: existingSubscriptionError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("device_id", deviceId)
      .eq("subscription_endpoint", endpoint)
      .maybeSingle();

    if (existingSubscriptionError) throw existingSubscriptionError;

    const payload = {
      device_id: deviceId,
      subscription_endpoint: endpoint,
      subscription_key: serializeSubscriptionMetadata(metadata),
      active: true,
    };

    if (existingSubscription?.id) {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .update(payload)
        .eq("id", existingSubscription.id)
        .select("*")
        .single();

      if (error) throw error;
      return data as PushSubscriptionRow;
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data as PushSubscriptionRow;
  },
};
