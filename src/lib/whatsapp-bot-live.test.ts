import { describe, expect, it } from "vitest";
import { processGroupBotMessage, formatMinorAmount } from "./whatsapp-group-bot-core";
import { handleLeaseSigningProgress } from "./lease-esignature.service";

describe("whatsapp group bot live context", () => {
  it("formats minor currency amounts", () => {
    expect(formatMinorAmount(650000, "GHS")).toContain("6,500.00");
  });

  it("shows real rent balance when tenant context is provided", () => {
    const res = processGroupBotMessage("233244123456", "1", false, {
      tenantUserId: "user-1",
      tenantName: "Ama Ampomah",
      unitLabel: "4B",
      estateName: "Cantonments Luxury Suites",
      currency: "GHS",
      outstandingMinor: 125000,
      rentMinor: 650000,
      paymentUrl: "https://app.baytmiftah.com/app/payments",
    });
    expect(res.replyMessage).toContain("6,500.00");
    expect(res.replyMessage).toContain("1,250.00");
    expect(res.replyMessage).toContain("Cantonments");
    expect(res.actionRequired).toBe("TRIGGER_MOMO");
  });

  it("shows gate pass from mutation context", () => {
    const res = processGroupBotMessage("233244123456", "2", true, {
      tenantUserId: "user-1",
      lastGatePass: {
        pinCode: "482910",
        validUntil: "2026-09-03T20:00:00Z",
        estateName: "Cantonments",
        unitLabel: "4B",
        visitorName: "Guest",
      },
    });
    expect(res.replyMessage).toContain("482910");
    expect(res.actionRequired).toBe("DISPATCH_GATE_PIN");
  });

  it("lists open maintenance tickets from context", () => {
    const res = processGroupBotMessage("233244123456", "4", false, {
      tenantUserId: "user-1",
      openTickets: [
        { id: "abc12345-678", title: "AC not cooling", status: "in_progress", priority: "high" },
      ],
    });
    expect(res.replyMessage).toContain("AC not cooling");
    expect(res.replyMessage).toContain("in_progress");
  });
});

describe("handleLeaseSigningProgress", () => {
  it("returns null for partially_signed without cosign notify flag", async () => {
    const result = await handleLeaseSigningProgress({
      status: "partially_signed",
      esignature_request_id: "req-1",
      lease_id: "lease-1",
      signer_email: "tenant@test.com",
    });
    expect(result).toBeNull();
  });

  it("returns null for completed (server finalizes lease)", async () => {
    const result = await handleLeaseSigningProgress({
      status: "completed",
      esignature_request_id: "req-1",
      lease_id: "lease-1",
    });
    expect(result).toBeNull();
  });
});
