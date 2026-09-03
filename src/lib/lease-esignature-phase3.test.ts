import { describe, expect, it } from "vitest";
import { countAvailableAddenda, getAutoAddendum } from "./country-rules/subdivision-addenda-auto";
import { getSubdivisionClauseAddendum } from "./country-rules/subdivision-clause-addenda";
import { jurisdictionCounselSignoffService } from "./jurisdiction-counsel-signoff.service";
import { docuSignEnvelopeService } from "./docusign-envelope.service";

describe("phase3 lease expansion", () => {
  it("auto-generates addenda for 50+ subdivisions", () => {
    expect(countAvailableAddenda()).toBeGreaterThanOrEqual(50);
  });

  it("falls back to auto addendum for US Texas", () => {
    const addendum = getSubdivisionClauseAddendum("US", "TX");
    expect(addendum?.label).toBe("Texas");
    expect(addendum?.clauses.length).toBeGreaterThan(0);
  });

  it("prefers curated addendum for Dubai Ejari", () => {
    const addendum = getSubdivisionClauseAddendum("AE", "DXB");
    expect(addendum?.title).toContain("Ejari");
  });

  it("throws counsel signoff required when not signed off", () => {
    expect(() =>
      jurisdictionCounselSignoffService.assertSignoff("org", "GH", "AA", false)
    ).toThrow(/Counsel sign-off required/);
  });

  it("builds DocuSign envelope draft from lease body", () => {
    const envelope = docuSignEnvelopeService.buildDocuSignEnvelope({
      documentName: "Test Lease",
      documentBody: "# Lease\n\nClause 1",
      signerName: "Tenant",
      signerEmail: "tenant@example.com",
      metadata: { jurisdictionLabel: "Ghana" },
    });
    expect(envelope.documents[0].textContent).toContain("Clause 1");
    expect(envelope.signers[0].email).toBe("tenant@example.com");
  });
});
