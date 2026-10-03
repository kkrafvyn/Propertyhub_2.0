import { describe, expect, it, vi, beforeEach } from "vitest";

vi.stubEnv("VITE_WEB_PUSH_PUBLIC_KEY", "");

describe("pushNotificationService.registerBrowserPush", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not report success when VAPID key is missing", async () => {
    const { pushNotificationService } = await import("./push-notification.service");
    vi.spyOn(pushNotificationService, "canUseLocalNotifications").mockReturnValue(true);
    vi.spyOn(pushNotificationService, "requestPermission").mockResolvedValue("granted");

    const result = await pushNotificationService.registerBrowserPush("user-1");
    expect(result).toEqual({
      configured: false,
      reason: "Web push is not configured (missing VITE_WEB_PUSH_PUBLIC_KEY).",
    });
  });
});
