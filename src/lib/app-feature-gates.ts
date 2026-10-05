import {
  getPlatformFeatureFlagsCached,
  type PlatformFeatureFlags,
} from "./platform-feature-flags";
import { videoCallsAvailable, voiceCallsAvailable } from "./communications-capabilities";

export function isWhatsAppEnabledForApp(flags: PlatformFeatureFlags = getPlatformFeatureFlagsCached()) {
  return flags.whatsapp;
}

export function isVoiceCallsEnabledForApp(flags: PlatformFeatureFlags = getPlatformFeatureFlagsCached()) {
  return flags.voiceCalls && voiceCallsAvailable();
}

export function isVideoCallsEnabledForApp(flags: PlatformFeatureFlags = getPlatformFeatureFlagsCached()) {
  return flags.videoCalls && videoCallsAvailable();
}

export function isAiAssistantEnabledForApp(flags: PlatformFeatureFlags = getPlatformFeatureFlagsCached()) {
  return flags.aiAssistant;
}
