import { beforeEach, describe, expect, it } from "vitest";
import {
  appendReferralMetadata,
  buildReferralPerformanceSnapshot,
  getStoredReferralEvents,
  stripReferralMetadata,
  trackReferralDealCaseCreated,
  trackReferralSearchAlert,
  trackReferralVisit,
} from "./referral-attribution.service";

describe("referral attribution service", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("appends and strips referral metadata safely", () => {
    const message = appendReferralMetadata("Interested in this listing.", {
      ref: "user-1",
      channel: "diaspora",
    });

    expect(message).toContain("propertyhub:referral");
    expect(stripReferralMetadata(message)).toBe("Interested in this listing.");
  });

  it("records referral events and summarizes them", () => {
    trackReferralVisit({ ref: "user-1", channel: "diaspora" }, { source: "search" });
    trackReferralSearchAlert({ ref: "user-1", channel: "diaspora" }, { source: "search" });
    trackReferralDealCaseCreated(
      { ref: "user-1", channel: "diaspora" },
      {
        dealCaseId: "case-1",
        caseType: "purchase_offer",
        organizationId: "org-1",
      }
    );

    const events = getStoredReferralEvents("user-1");
    const snapshot = buildReferralPerformanceSnapshot({ events, referrerKey: "user-1" });

    expect(snapshot.totals.visits).toBe(1);
    expect(snapshot.totals.savedAlerts).toBe(1);
    expect(snapshot.totals.leads).toBe(1);
    expect(snapshot.totals.estimatedRewardMinor).toBeGreaterThan(0);
  });

  it("builds referral performance from deal cases carrying metadata", () => {
    const caseMessage = appendReferralMetadata("Offer submitted for East Legon home", {
      ref: "agency-1",
      channel: "executive-rentals",
    });

    const snapshot = buildReferralPerformanceSnapshot({
      cases: [
        {
          id: "case-1",
          case_type: "purchase_offer",
          pipeline_stage: "won",
          status: "closed",
          message: caseMessage,
          created_at: "2026-05-10T10:00:00.000Z",
          updated_at: "2026-05-11T10:00:00.000Z",
        },
      ],
    });

    expect(snapshot.campaigns).toHaveLength(1);
    expect(snapshot.campaigns[0]?.channel).toBe("executive-rentals");
    expect(snapshot.campaigns[0]?.leads).toBe(1);
    expect(snapshot.campaigns[0]?.wonDeals).toBe(1);
  });
});
