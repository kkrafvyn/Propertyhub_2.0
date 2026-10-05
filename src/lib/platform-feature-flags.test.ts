import { describe, expect, it } from "vitest";
import { parsePlatformFeatureFlags, PLATFORM_FEATURE_SETTING_KEYS } from "./platform-feature-flags";

describe("parsePlatformFeatureFlags", () => {
  it("defaults features to enabled when unset", () => {
    expect(parsePlatformFeatureFlags({})).toEqual({
      whatsapp: true,
      voiceCalls: true,
      videoCalls: true,
      aiAssistant: true,
    });
  });

  it("respects explicit false values", () => {
    expect(
      parsePlatformFeatureFlags({
        [PLATFORM_FEATURE_SETTING_KEYS.whatsapp]: "false",
        [PLATFORM_FEATURE_SETTING_KEYS.aiAssistant]: false,
      }),
    ).toMatchObject({
      whatsapp: false,
      aiAssistant: false,
    });
  });
});
