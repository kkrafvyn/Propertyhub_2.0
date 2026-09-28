import { describe, expect, it } from "vitest";
import {
  assertUserLegalCapacity,
  buildLegalCapacityRecord,
  getMinimumAgeForJurisdiction,
  LEGAL_CAPACITY_ACTIONS,
} from "./legal-capacity";
import {
  isJurisdictionReadyFor,
  setJurisdictionReadiness,
  type JurisdictionReadinessRecord,
} from "./jurisdiction-readiness";

describe("legal-capacity enforcement", () => {
  it("underage user cannot sign lease", () => {
    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "2010-01-01",
      jurisdictionCode: "GH",
      ageVerificationSource: "kyc_verified",
      ageVerificationLevel: "verified",
    });

    expect(() => assertUserLegalCapacity(record, "GH", "lease_signature")).toThrow(/minimum age/i);
  });

  it("underage user cannot execute payment", () => {
    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "2010-01-01",
      jurisdictionCode: "NG",
      ageVerificationSource: "kyc_verified",
      ageVerificationLevel: "verified",
    });

    expect(() => assertUserLegalCapacity(record, "NG", "payment_authorization")).toThrow(/minimum age/i);
  });

  it("underage user cannot request payout", () => {
    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "2010-01-01",
      jurisdictionCode: "US",
      ageVerificationSource: "kyc_verified",
      ageVerificationLevel: "verified",
    });

    expect(() => assertUserLegalCapacity(record, "US", "payout_instruction")).toThrow(/minimum age/i);
  });

  it("client cannot spoof DOB", () => {
    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "1998-01-01",
      jurisdictionCode: "GH",
      ageVerificationSource: "user_attested",
      ageVerificationLevel: "self_attested",
    });

    expect(() => assertUserLegalCapacity(record, "GH", "lease_application")).toThrow(/trusted.*verification/i);
  });

  it("adult verified user passes", () => {
    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "1998-01-01",
      jurisdictionCode: "KE",
      ageVerificationSource: "kyc_verified",
      ageVerificationLevel: "verified",
    });

    expect(() => assertUserLegalCapacity(record, "KE", "account_transactional_use")).not.toThrow();
  });

  it("country rule changes are honored", () => {
    const minimumAge = getMinimumAgeForJurisdiction("US");
    expect(minimumAge).toBe(18);

    const record = buildLegalCapacityRecord({
      verifiedDateOfBirth: "2010-01-01",
      jurisdictionCode: "US",
      ageVerificationSource: "kyc_verified",
      ageVerificationLevel: "verified",
    });

    expect(() => assertUserLegalCapacity(record, "US", "lease_application")).toThrow(/minimum age/i);
  });

  it("keeps legal-capacity actions explicit and enforced", () => {
    expect(LEGAL_CAPACITY_ACTIONS).toContain("lease_signature");
    expect(LEGAL_CAPACITY_ACTIONS).toContain("payment_authorization");
    expect(LEGAL_CAPACITY_ACTIONS).toContain("payout_instruction");
  });
});

describe("jurisdiction readiness registry", () => {
  it("denies unapproved jurisdictions for sensitive production functions", () => {
    const readiness: JurisdictionReadinessRecord = {
      jurisdictionCode: "GH",
      enabledForMarketplace: true,
      enabledForLeasing: true,
      enabledForPayments: false,
      enabledForScreening: true,
      enabledForEsign: false,
      enabledForPropertyManagement: false,
      legalReviewStatus: "approved",
      privacyReviewStatus: "approved",
      paymentReviewStatus: "pending",
      taxReviewStatus: "approved",
      screeningReviewStatus: "approved",
      housingReviewStatus: "approved",
      rulesVersion: "2026-09-28",
    };

    expect(isJurisdictionReadyFor(readiness, "payments")).toBe(false);
    expect(isJurisdictionReadyFor(readiness, "leasing")).toBe(true);
  });

  it("fails closed when readiness metadata is missing or unapproved", () => {
    const readiness: JurisdictionReadinessRecord = {
      jurisdictionCode: "KE",
      enabledForMarketplace: true,
      enabledForLeasing: true,
      enabledForPayments: true,
      enabledForScreening: true,
      enabledForEsign: true,
      enabledForPropertyManagement: true,
      legalReviewStatus: "pending",
      privacyReviewStatus: "approved",
      paymentReviewStatus: "approved",
      taxReviewStatus: "approved",
      screeningReviewStatus: "approved",
      housingReviewStatus: "approved",
      rulesVersion: "2026-09-28",
    };

    expect(isJurisdictionReadyFor(readiness, "payments")).toBe(false);
    expect(isJurisdictionReadyFor(readiness, "leasing")).toBe(false);
  });

  it("allows overrides to add approved readiness metadata", () => {
    const readiness = setJurisdictionReadiness("US", {
      enabledForMarketplace: true,
      enabledForLeasing: true,
      enabledForPayments: true,
      enabledForScreening: true,
      enabledForEsign: true,
      enabledForPropertyManagement: true,
      legalReviewStatus: "approved",
      privacyReviewStatus: "approved",
      paymentReviewStatus: "approved",
      taxReviewStatus: "approved",
      screeningReviewStatus: "approved",
      housingReviewStatus: "approved",
      rulesVersion: "2026-09-28",
    });

    expect(isJurisdictionReadyFor(readiness, "payments")).toBe(true);
    expect(readiness.jurisdictionCode).toBe("US");
  });
});
