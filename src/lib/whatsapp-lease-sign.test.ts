import { describe, expect, it } from "vitest";
import { processGroupBotMessage } from "./whatsapp-group-bot-core";
import { whatsappLeaseSignService } from "./whatsapp-lease-sign.service";

describe("whatsapp lease sign", () => {
  it("returns signing link when pending envelope exists in context", () => {
    const res = processGroupBotMessage("233244123456", "6", true, {
      pendingLeaseSignUrl: "https://app.baytmiftah.com/sign/token-123",
      pendingLeaseDocumentName: "Residential lease — Unit 4B",
      jurisdictionLabel: "Greater Accra",
    });
    expect(res.actionRequired).toBe("LEASE_SIGN");
    expect(res.replyMessage).toContain("token-123");
    expect(res.replyMessage).toContain("Unit 4B");
  });

  it("returns helpful message when no pending lease", () => {
    const res = processGroupBotMessage("233244123456", "sign", true);
    expect(res.actionRequired).toBe("NONE");
    expect(res.replyMessage).toContain("No pending lease");
  });

  it("formatSignReply includes document and URL", () => {
    const text = whatsappLeaseSignService.formatSignReply(
      {
        esignatureRequestId: "req-1",
        leaseId: "lease-1",
        documentName: "Commercial lease",
        signingUrl: "https://app.baytmiftah.com/sign/abc",
        jurisdictionLabel: "Lagos State",
      },
      "Ama"
    );
    expect(text).toContain("Commercial lease");
    expect(text).toContain("/sign/abc");
    expect(text).toContain("Ama");
  });

  it("buildSigningUrl includes signer token query param", () => {
    const url = whatsappLeaseSignService.buildSigningUrl("tok_xyz", "signer_abc");
    expect(url).toMatch(/\/sign\/tok_xyz\?st=signer_abc$/);
  });
});
