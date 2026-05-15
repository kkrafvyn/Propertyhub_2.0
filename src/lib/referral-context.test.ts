import { beforeEach, describe, expect, it } from "vitest";
import {
  buildReferralQueryString,
  captureReferralContext,
  extractReferralContext,
  formatReferralChannel,
  readReferralContext,
} from "./referral-context";

describe("referral context", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("extracts referral values from search params", () => {
    expect(
      extractReferralContext(new URLSearchParams("ref=user-123&channel=buyer-referral"))
    ).toEqual({
      ref: "user-123",
      channel: "buyer-referral",
    });
  });

  it("builds a stable query string for forwarding referral context", () => {
    expect(
      buildReferralQueryString({ ref: "agent-42", channel: "diaspora-intro" })
    ).toBe("?ref=agent-42&channel=diaspora-intro");
  });

  it("stores and restores referral context in session storage", () => {
    captureReferralContext("?ref=owner-9&channel=executive-rentals");

    expect(readReferralContext()).toEqual({
      ref: "owner-9",
      channel: "executive-rentals",
    });
  });

  it("formats referral channel labels for UI copy", () => {
    expect(formatReferralChannel("buyer-referral")).toBe("Buyer Referral");
  });
});
