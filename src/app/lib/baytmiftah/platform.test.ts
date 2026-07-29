import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

import { Capacitor } from "@capacitor/core";
import { isNativeApp, shouldShowLaunchSplash } from "./platform";

describe("platform", () => {
  it("does not show launch splash in browser builds", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    expect(isNativeApp()).toBe(false);
    expect(shouldShowLaunchSplash()).toBe(false);
  });

  it("shows launch splash only on native Capacitor", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    expect(isNativeApp()).toBe(true);
    expect(shouldShowLaunchSplash()).toBe(true);
  });
});
