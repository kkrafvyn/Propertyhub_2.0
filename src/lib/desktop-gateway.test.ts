import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDesktopPromptSeen,
  DESKTOP_GATEWAY_PATH,
  hasSeenDesktopPrompt,
  isBusinessWebUser,
  markDesktopPromptSeen,
  resolveBusinessWebHome,
  shouldOfferDesktopGateway,
} from "./desktop-gateway";

const businessUser = {
  id: "user-business",
  user_metadata: { role: "host" },
};

describe("desktop gateway", () => {
  beforeEach(() => {
    clearDesktopPromptSeen("user-business");
    clearDesktopPromptSeen("user-consumer");
  });

  it("detects business users from workspace roles", () => {
    expect(isBusinessWebUser(businessUser, null)).toBe(true);
    expect(isBusinessWebUser({ id: "1", user_metadata: { role: "consumer" } }, null)).toBe(false);
    expect(
      isBusinessWebUser({ id: "1", user_metadata: { account_type: "landlord" } }, null),
    ).toBe(true);
  });

  it("excludes platform staff from business desktop flow", () => {
    expect(
      isBusinessWebUser(businessUser, { is_platform_admin: true }),
    ).toBe(false);
  });

  it("offers the gateway only before the prompt is dismissed", () => {
    expect(shouldOfferDesktopGateway(businessUser, null)).toBe(true);
    markDesktopPromptSeen("user-business");
    expect(hasSeenDesktopPrompt("user-business")).toBe(true);
    expect(shouldOfferDesktopGateway(businessUser, null)).toBe(false);
  });

  it("resolves business home to gateway then workspace", () => {
    expect(resolveBusinessWebHome(businessUser, null)).toBe(DESKTOP_GATEWAY_PATH);
    markDesktopPromptSeen("user-business");
    expect(resolveBusinessWebHome(businessUser, null)).toBe("/workspace");
  });
});
