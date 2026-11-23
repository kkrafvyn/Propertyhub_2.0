import { describe, expect, it } from "vitest";
import {
  CONSUMER_KYC_REMINDER_AFTER_DAYS,
  shouldShowConsumerKycReminder,
} from "./consumer-kyc-journey";

const now = new Date("2026-11-23T07:00:00Z");

describe("progressive consumer KYC reminders", () => {
  it("does not demand KYC when a consumer has just registered", () => {
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "2026-11-23T06:59:00Z", now,
    })).toBe(false);
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "2026-11-20T07:00:00Z", now,
    })).toBe(false);
  });

  it("shows a dismissible reminder after the onboarding grace period", () => {
    expect(CONSUMER_KYC_REMINDER_AFTER_DAYS).toBe(7);
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "2026-11-16T07:00:00Z", now,
    })).toBe(true);
  });

  it("does not prompt verified accounts or accounts with unknown/future creation dates", () => {
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "2026-11-01T07:00:00Z", now, kycVerified: true,
    })).toBe(false);
    expect(shouldShowConsumerKycReminder({ accountCreatedAt: "", now })).toBe(false);
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "invalid", now,
    })).toBe(false);
    expect(shouldShowConsumerKycReminder({
      accountCreatedAt: "2026-12-01T07:00:00Z", now,
    })).toBe(false);
  });
});
