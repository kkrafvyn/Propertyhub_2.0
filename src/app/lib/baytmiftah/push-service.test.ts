import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../lib/push-notification.service", () => ({
  pushNotificationService: {
    registerBrowserPush: vi.fn(),
  },
}));

vi.mock("../../../lib/communications-capabilities", () => ({
  nativePushAvailable: () => false,
}));

import { pushNotificationService } from "../../../lib/push-notification.service";
import { enableBrowserPush, registerPushToken } from "./push-service";

describe("enableBrowserPush", () => {
  beforeEach(() => {
    vi.mocked(pushNotificationService.registerBrowserPush).mockReset();
  });

  it("does not report success when VAPID is not configured", async () => {
    vi.mocked(pushNotificationService.registerBrowserPush).mockResolvedValue({
      configured: false,
      reason: "Web push is not configured (missing VAPID keys).",
    });
    const result = await enableBrowserPush("user-1");
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/not configured/i) });
  });
});

describe("registerPushToken", () => {
  it("returns honest failure without native push", async () => {
    const result = await registerPushToken("token");
    expect(result.ok).toBe(false);
  });
});
