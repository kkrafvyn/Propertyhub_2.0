import { describe, expect, it } from "vitest";
import { prepareLeaseEnvelope } from "./lease-esignature.service";
import { assertLeaseAuditPassing, LeaseAuditBlockedError } from "./lease-audit-gate";

describe("lease-esignature.service", () => {
  it("prepares envelope with jurisdiction clauses and audit score", () => {
    const prepared = prepareLeaseEnvelope({
      organizationId: "org-1",
      lease: {
        id: "lease-1",
        organization_id: "org-1",
        rent_minor: 450000,
        currency: "GHS",
        start_date: "2026-04-01",
        tenant: { full_name: "Ama Ampomah", email: "ama@example.com" },
        listing: {
          property: {
            address: "12 Independence Ave",
            country: "Ghana",
            region: "Greater Accra",
            city: "Accra",
            subdivision_code: "AA",
          },
        },
      },
      landlordName: "Kofi Owusu",
    });

    expect(prepared.documentName).toContain("Independence");
    expect(prepared.documentBody).toContain("Mandatory clauses");
    expect(prepared.jurisdictionLabel).toContain("Ghana");
    expect(prepared.auditScore).toBeGreaterThan(0);
    expect(prepared.warnings.length).toBeGreaterThan(0);
  });

  it("appends custom clauses to generated body", () => {
    const prepared = prepareLeaseEnvelope({
      organizationId: "org-1",
      lease: {
        id: "lease-2",
        organization_id: "org-1",
        rent_minor: 100000,
        currency: "KES",
        tenant: { full_name: "John", email: "john@example.com" },
        listing: {
          property: {
            country: "Kenya",
            city: "Nairobi",
            subdivision_code: "NBI",
          },
        },
      },
      customClauses: ["Pets permitted with written consent."],
    });

    expect(prepared.documentBody).toContain("Additional terms");
    expect(prepared.documentBody).toContain("Pets permitted");
  });

  it("flags low audit score on non-compliant draft", () => {
    const badDraft = "2 years advance rent. Lock tenant out without court.";
    const prepared = prepareLeaseEnvelope({
      organizationId: "org-1",
      lease: {
        id: "lease-x",
        organization_id: "org-1",
        rent_minor: 100000,
        tenant: { full_name: "Test", email: "test@example.com" },
        listing: {
          property: { country: "Ghana", city: "Accra", subdivision_code: "AA" },
        },
      },
      customClauses: [badDraft],
    });
    if (prepared.auditScore >= 50) return;
    expect(() => assertLeaseAuditPassing(prepared.auditScore)).toThrow(LeaseAuditBlockedError);
    expect(() => assertLeaseAuditPassing(prepared.auditScore, { forceOverride: true })).not.toThrow();
  });
});
