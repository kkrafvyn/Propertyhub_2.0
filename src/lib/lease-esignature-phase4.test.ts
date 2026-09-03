import { describe, expect, it } from "vitest";
import { countAvailableAddenda } from "./country-rules/subdivision-addenda-auto";
import { countCuratedAddenda, getSubdivisionClauseAddendum } from "./country-rules/subdivision-clause-addenda";
import { normalisePhoneForSms } from "./sms-gateway.service";
import { docuSignEnvelopeService } from "./docusign-envelope.service";

describe("phase4 lease expansion", () => {
  it("has 40+ curated subdivision addenda", () => {
    expect(countCuratedAddenda()).toBeGreaterThanOrEqual(40);
  });

  it("still auto-generates 50+ total addenda", () => {
    expect(countAvailableAddenda()).toBeGreaterThanOrEqual(50);
  });

  it("curated Texas addendum preferred over auto", () => {
    const addendum = getSubdivisionClauseAddendum("US", "TX");
    expect(addendum?.title).toContain("Texas");
  });

  it("normalises Ghana phone numbers for SMS", () => {
    expect(normalisePhoneForSms("0244123456")).toBe("+233244123456");
    expect(normalisePhoneForSms("+254712345678")).toBe("+254712345678");
  });

  it("builds DocuSign envelope with base64 document", () => {
    const envelope = docuSignEnvelopeService.buildDocuSignEnvelope({
      documentName: "Lease TX",
      documentBody: "Clause A",
      signerName: "Jane",
      signerEmail: "jane@example.com",
    });
    expect(envelope.documents[0].documentBase64).toBeTruthy();
  });
});
