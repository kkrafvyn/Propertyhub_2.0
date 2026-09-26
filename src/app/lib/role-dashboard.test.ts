import { describe, expect, it } from "vitest";
import {
  getAgencyDashboardConfig,
  getConsumerDashboardConfig,
  getPropertyOperationsDashboardConfig,
  normalizeAgencyDashboardRole,
  normalizeConsumerDashboardRole,
  normalizePropertyOperationsDashboardRole,
} from "./role-dashboard";

describe("consumer dashboard role config", () => {
  it("normalizes buyer and renter roles", () => {
    expect(normalizeConsumerDashboardRole("buyer")).toBe("buyer");
    expect(normalizeConsumerDashboardRole("renter")).toBe("renter");
    expect(normalizeConsumerDashboardRole("consumer")).toBe("consumer");
  });

  it("returns buyer-specific dashboard metadata", () => {
    const config = getConsumerDashboardConfig("buyer");
    expect(config.kicker).toBe("Buying dashboard");
    expect(config.summaryCards[0].label).toBe("Saved homes");
    expect(config.summaryCards[1].label).toBe("Offers");
  });

  it("returns renter-specific dashboard metadata", () => {
    const config = getConsumerDashboardConfig("renter");
    expect(config.kicker).toBe("Renter dashboard");
    expect(config.summaryCards[0].label).toBe("Saved rentals");
    expect(config.summaryCards[1].label).toBe("Leases");
  });
});

describe("agency dashboard role config", () => {
  it("normalizes agency roles", () => {
    expect(normalizeAgencyDashboardRole("agency_agent")).toBe("agency_agent");
    expect(normalizeAgencyDashboardRole("agency_manager")).toBe("agency_manager");
    expect(normalizeAgencyDashboardRole("agency_owner")).toBe("agency_owner");
  });

  it("returns agency-specific dashboard metadata", () => {
    const config = getAgencyDashboardConfig("agency_agent");
    expect(config.kicker).toBe("Agency dashboard");
    expect(config.summaryCards[0].label).toBe("Pipeline");
    expect(config.summaryCards[1].label).toBe("Listings");
  });

  it("keeps agency roles routed to workspace-oriented entry points", () => {
    expect(normalizeAgencyDashboardRole("independent_agent")).toBe("independent_agent");
    expect(normalizeAgencyDashboardRole("agency_manager")).toBe("agency_manager");
    expect(normalizeAgencyDashboardRole("agency_owner")).toBe("agency_owner");
  });
});

describe("property operations dashboard role config", () => {
  it("normalizes owner and manager roles", () => {
    expect(normalizePropertyOperationsDashboardRole("property_owner")).toBe("property_owner");
    expect(normalizePropertyOperationsDashboardRole("property_manager")).toBe("property_manager");
  });

  it("returns owner and manager-specific dashboard metadata", () => {
    expect(getPropertyOperationsDashboardConfig("property_owner").summaryCards[0].label).toBe("Portfolio");
    expect(getPropertyOperationsDashboardConfig("property_manager").summaryCards[0].label).toBe("Properties");
  });
});
