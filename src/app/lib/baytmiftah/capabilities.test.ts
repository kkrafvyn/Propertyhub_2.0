import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  deriveConsumerCapabilities,
  hasCapability,
} from "./capabilities";
import { getContextualTabs } from "./consumer-nav";

describe("deriveConsumerCapabilities", () => {
  it("returns base consumer capabilities for empty context", () => {
    const caps = deriveConsumerCapabilities({
      hasBookingContext: false,
      hasRentingContext: false,
      hasBuyingContext: false,
    });

    expect(caps).toEqual(
      expect.arrayContaining([
        CAPABILITIES.BUY,
        CAPABILITIES.RENT,
        CAPABILITIES.LEASE,
        CAPABILITIES.STAY_GUEST,
      ]),
    );
  });

  it("adds smart resident when renting context is active", () => {
    const caps = deriveConsumerCapabilities({
      hasBookingContext: false,
      hasRentingContext: true,
      hasBuyingContext: false,
    });

    expect(hasCapability(caps, "smart_resident")).toBe(true);
  });

  it("adds stay host capability for workspace app roles", () => {
    const caps = deriveConsumerCapabilities(null, "host");

    expect(hasCapability(caps, CAPABILITIES.STAY_HOST)).toBe(true);
  });
});

describe("getContextualTabs", () => {
  it("unlocks lease and rent tabs when capabilities are present", () => {
    const tabs = getContextualTabs([
      CAPABILITIES.LEASE,
      CAPABILITIES.RENT,
      CAPABILITIES.BUY,
      CAPABILITIES.STAY_GUEST,
    ]);

    expect(tabs.some((tab) => tab.labelKey === "profileNav.leaseJourney")).toBe(true);
    expect(tabs.some((tab) => tab.labelKey === "profileNav.rentJourney")).toBe(true);
    expect(tabs.some((tab) => tab.labelKey === "profileNav.buyJourney")).toBe(true);
  });

  it("unlocks host workspace tabs for stay hosts", () => {
    const tabs = getContextualTabs([CAPABILITIES.STAY_HOST]);

    expect(tabs.some((tab) => tab.labelKey === "consumer.context.hostDashboard")).toBe(true);
    expect(tabs.some((tab) => tab.labelKey === "consumer.context.listProperty")).toBe(true);
  });
});
