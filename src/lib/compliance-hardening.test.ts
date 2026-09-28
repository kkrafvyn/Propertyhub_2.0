import { describe, expect, it } from "vitest";
import { authorizeRepresentativeAction, buildRepresentativeScope, type RepresentativeAction } from "./representative-scope";
import {
  applyPrivacyHold,
  buildPrivacyExport,
  canProcessPrivacyRequest,
  redactContactForSafeChannel,
  safeLocationConsent,
} from "./privacy-and-safety";

describe("privacy and safety gating", () => {
  it("denies erasure while a legal hold is active", () => {
    const result = canProcessPrivacyRequest({
      requestType: "erasure",
      userId: "user-123",
      verifiedIdentity: true,
      activeLegalHold: true,
      hasActiveLease: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/legal hold|active contract/i);
  });

  it("allows export request for verified data subject", () => {
    const result = canProcessPrivacyRequest({
      requestType: "export",
      userId: "user-123",
      verifiedIdentity: true,
      activeLegalHold: false,
      hasActiveLease: false,
    });

    expect(result.allowed).toBe(true);
    expect(result.exports).toContain("profile");
  });

  it("redacts phone and exact location unless safe contact is enabled", () => {
    expect(redactContactForSafeChannel({
      phone: "+233551234567",
      email: "host@example.com",
      exactLocation: "Accra, East Legon",
      allowSafeContact: false,
      allowLocationSharing: false,
    })).toMatchObject({
      phone: expect.stringContaining("***"),
      exactLocation: expect.stringContaining("redacted"),
    });
  });

  it("requires explicit consent before sharing exact location", () => {
    const consent = safeLocationConsent({
      allowLocationSharing: false,
      locationConsentStatus: "not_given",
    });

    expect(consent.allowed).toBe(false);
  });

  it("applies privacy hold to export bundle for under review requests", () => {
    const exportBundle = buildPrivacyExport({
      userId: "user-123",
      includeProfile: true,
      includePaymentHistory: true,
      includeMessages: true,
      includeLocation: true,
      safetyReviewRequired: true,
    });

    expect(exportBundle.safeBundle).toBe(true);
    expect(exportBundle.data).toContain("profile");
    expect(exportBundle.data).toContain("messages");
  });
});

describe("representative authority and scope", () => {
  it("denies action outside delegated scope", () => {
    const scope = buildRepresentativeScope({
      representativeId: "rep-1",
      organizationId: "org-1",
      allowedActions: ["view_ledger", "approve_offer"],
      status: "approved",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    expect(() => authorizeRepresentativeAction(scope, "payment_release" as RepresentativeAction)).toThrow(/scope/i);
  });

  it("approves delegated actions that are still active", () => {
    const scope = buildRepresentativeScope({
      representativeId: "rep-1",
      organizationId: "org-1",
      allowedActions: ["view_ledger", "approve_offer"],
      status: "approved",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    expect(() => authorizeRepresentativeAction(scope, "approve_offer" as RepresentativeAction)).not.toThrow();
  });

  it("blocks expired or rejected authority", () => {
    const scope = buildRepresentativeScope({
      representativeId: "rep-1",
      organizationId: "org-1",
      allowedActions: ["view_ledger"],
      status: "rejected",
      expiresAt: "2024-01-01T00:00:00.000Z",
    });

    expect(() => authorizeRepresentativeAction(scope, "view_ledger" as RepresentativeAction)).toThrow(/status|expired/i);
  });
});
