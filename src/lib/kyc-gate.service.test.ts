import { describe, expect, it } from "vitest";
import {
  canBookStay,
  canSubmitWorkspaceEnrollment,
  hasKycSubmission,
  personalWorkspaceName,
  personalWorkspaceSlug,
  requiresConsumerKycForBooking,
  resolveKycEngine,
} from "./kyc-gate.service";

describe("kyc-gate.service", () => {
  it("resolves Ghana KYC engine from country pack", () => {
    expect(resolveKycEngine("GH")).toBe("ghana-trust");
  });

  it("requires consumer KYC for Ghana bookings", () => {
    expect(requiresConsumerKycForBooking("GH")).toBe(true);
  });

  it("blocks booking when KYC is missing in regulated market", () => {
    expect(canBookStay(null, "GH")).toBe(false);
    expect(canBookStay({ status: "verified" }, "GH")).toBe(true);
  });

  it("allows workspace enrollment submit once KYC is submitted", () => {
    expect(canSubmitWorkspaceEnrollment(null, "GH")).toBe(false);
    expect(
      canSubmitWorkspaceEnrollment({ submission: { status: "submitted" } }, "GH"),
    ).toBe(true);
  });

  it("detects submitted KYC", () => {
    expect(hasKycSubmission({ submission: { status: "in_review" } })).toBe(true);
    expect(hasKycSubmission({ status: "none" })).toBe(false);
  });

  it("builds personal workspace identifiers", () => {
    expect(personalWorkspaceSlug("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "personal-aaaaaaaabb",
    );
    expect(personalWorkspaceName("Ada")).toBe("Ada's Properties");
  });
});
