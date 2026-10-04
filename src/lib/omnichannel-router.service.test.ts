import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./realtime-messaging.service", () => ({
  realtimeMessagingService: {
    sendMessage: vi.fn().mockResolvedValue({ id: "msg-1" }),
  },
}));

vi.mock("./fcm-push.service", () => ({
  fcmPushService: {
    dispatchPushNotification: vi.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
  },
}));

vi.mock("./sms-gateway.service", () => ({
  sendEstateSms: vi.fn(),
}));

import { OmnichannelRouterService } from "./omnichannel-router.service";

describe("OmnichannelRouterService.resolveChannels", () => {
  const router = new OmnichannelRouterService();

  it("respects requested channels and drops unsupported whatsapp", () => {
    const plan = router.resolveChannels({
      conversationId: "c1",
      recipientUserId: "u1",
      content: "hello",
      channels: ["push", "whatsapp" as never],
    });
    expect(plan).toEqual(["push"]);
  });

  it("defaults to all supported channels", () => {
    const plan = router.resolveChannels({
      conversationId: "c1",
      recipientUserId: "u1",
      content: "hello",
    });
    expect(plan).toEqual(["in_app", "push", "sms"]);
  });
});

describe("OmnichannelRouterService.routeMessage", () => {
  const router = new OmnichannelRouterService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips push when not requested", async () => {
    const report = await router.routeMessage({
      conversationId: "c1",
      recipientUserId: "u1",
      content: "hello",
      channels: ["in_app"],
    });
    expect(report.channelsAttempted).toEqual(["in_app"]);
    expect(report.channelsSucceeded).toContain("in_app");
  });
});
