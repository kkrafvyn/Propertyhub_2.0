import { describe, expect, it } from "vitest";
import { resolveNotificationDeliveryChannels } from "./communication-channels";

describe("resolveNotificationDeliveryChannels", () => {
  it("does not prepend in_app when skipInApp is true (notify + includeExternal path)", () => {
    const channels = resolveNotificationDeliveryChannels(["email", "push"], true);
    expect(channels).toEqual(["email", "push"]);
    expect(channels).not.toContain("in_app");
  });

  it("prepends in_app once for standalone sendNotification calls", () => {
    expect(resolveNotificationDeliveryChannels(["email"])).toEqual(["in_app", "email"]);
  });
});
