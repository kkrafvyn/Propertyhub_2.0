import { revenueManagementService } from "./revenue-management.service";
import { coerceSettingBoolean } from "./platform-fee-schedule";

export const PLATFORM_FEATURE_SETTING_KEYS = {
  whatsapp: "feature_whatsapp_enabled",
  voiceCalls: "feature_voice_calls_enabled",
  videoCalls: "feature_video_calls_enabled",
  aiAssistant: "feature_ai_assistant_enabled",
} as const;

export type PlatformFeatureFlags = {
  whatsapp: boolean;
  voiceCalls: boolean;
  videoCalls: boolean;
  aiAssistant: boolean;
};

export const DEFAULT_PLATFORM_FEATURE_FLAGS: PlatformFeatureFlags = {
  whatsapp: true,
  voiceCalls: true,
  videoCalls: true,
  aiAssistant: true,
};

const CACHE_TTL_MS = 60_000;
let cache: { flags: PlatformFeatureFlags; loadedAt: number } | null = null;

export function parsePlatformFeatureFlags(settings: Record<string, unknown>): PlatformFeatureFlags {
  return {
    whatsapp: coerceSettingBoolean(settings[PLATFORM_FEATURE_SETTING_KEYS.whatsapp], true),
    voiceCalls: coerceSettingBoolean(settings[PLATFORM_FEATURE_SETTING_KEYS.voiceCalls], true),
    videoCalls: coerceSettingBoolean(settings[PLATFORM_FEATURE_SETTING_KEYS.videoCalls], true),
    aiAssistant: coerceSettingBoolean(settings[PLATFORM_FEATURE_SETTING_KEYS.aiAssistant], true),
  };
}

export function getPlatformFeatureFlagsCached(): PlatformFeatureFlags {
  return cache?.flags ?? DEFAULT_PLATFORM_FEATURE_FLAGS;
}

export function clearPlatformFeatureFlagsCache() {
  cache = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("platform-feature-flags-updated"));
  }
}

export async function loadPlatformFeatureFlags(force = false): Promise<PlatformFeatureFlags> {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.flags;
  }
  const settings = await revenueManagementService.getSettings().catch(() => ({}));
  const flags = parsePlatformFeatureFlags(settings);
  cache = { flags, loadedAt: Date.now() };
  return flags;
}

export async function savePlatformFeatureFlags(
  flags: PlatformFeatureFlags,
  descriptions?: Partial<Record<keyof PlatformFeatureFlags, string>>,
): Promise<PlatformFeatureFlags> {
  const desc = descriptions ?? {};
  await Promise.all([
    revenueManagementService.setSetting(
      PLATFORM_FEATURE_SETTING_KEYS.whatsapp,
      flags.whatsapp,
      desc.whatsapp ?? "Enable WhatsApp automation and outbound messaging in the app",
    ),
    revenueManagementService.setSetting(
      PLATFORM_FEATURE_SETTING_KEYS.voiceCalls,
      flags.voiceCalls,
      desc.voiceCalls ?? "Enable in-app and click-to-call voice features",
    ),
    revenueManagementService.setSetting(
      PLATFORM_FEATURE_SETTING_KEYS.videoCalls,
      flags.videoCalls,
      desc.videoCalls ?? "Enable video calling when a video provider is configured",
    ),
    revenueManagementService.setSetting(
      PLATFORM_FEATURE_SETTING_KEYS.aiAssistant,
      flags.aiAssistant,
      desc.aiAssistant ?? "Enable AI assistant, command center, and ai-assistant edge",
    ),
  ]);
  cache = { flags, loadedAt: Date.now() };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("platform-feature-flags-updated"));
  }
  return flags;
}
