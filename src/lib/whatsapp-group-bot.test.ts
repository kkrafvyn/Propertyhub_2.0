import { describe, expect, it } from "vitest";
import {
  normalizeGroupBotAliases,
  processGroupBotMessage,
  resolveNextBotSessionState,
  shouldOpenMaintenanceFromSession,
  shouldRespondInGroup,
  stripGroupBotPrefix,
} from "./whatsapp-group-bot-core";
import { whatsappGroupBotService } from "./whatsapp-group-bot.service";
import { whatsappBusinessBotService } from "./whatsapp-business-bot.service";

describe("whatsapp group bot", () => {
  it("ignores group messages without mention by default", () => {
    expect(shouldRespondInGroup("hello everyone", normalizeGroupBotAliases(), false)).toBe(false);
  });

  it("responds when @BaytMiftah or /bm prefix is used", () => {
    expect(shouldRespondInGroup("@BaytMiftah menu", normalizeGroupBotAliases(), false)).toBe(true);
    expect(shouldRespondInGroup("/bm 2", normalizeGroupBotAliases(), false)).toBe(true);
  });

  it("strips group prefix before command parsing", () => {
    expect(stripGroupBotPrefix("@BaytMiftah menu", normalizeGroupBotAliases())).toBe("menu");
    expect(stripGroupBotPrefix("/bm gate pass", normalizeGroupBotAliases())).toBe("gate pass");
    expect(stripGroupBotPrefix("Hey @BaytMiftah kitchen leak", normalizeGroupBotAliases())).toBe("Hey kitchen leak");
  });

  it("opens maintenance from session follow-up", () => {
    expect(shouldOpenMaintenanceFromSession("awaiting_maintenance", "kitchen sink leak")).toBe(true);
    expect(shouldOpenMaintenanceFromSession("awaiting_maintenance", "menu")).toBe(false);
    expect(shouldOpenMaintenanceFromSession("idle", "kitchen sink leak")).toBe(false);
    expect(resolveNextBotSessionState("3", "idle")).toBe("awaiting_maintenance");
    expect(resolveNextBotSessionState("kitchen leak", "awaiting_maintenance")).toBe("idle");
  });

  it("maps maintenance keywords to manager alert when ticket already created", () => {
    const res = processGroupBotMessage("233244123456", "kitchen sink leak", true, {
      tenantUserId: "tenant-1",
      lastMaintenanceTicket: { ticketId: "abc-123", title: "kitchen sink leak", status: "open" },
    });
    expect(res.actionRequired).toBe("ALERT_MANAGER");
    expect(res.replyMessage).toContain("Maintenance ticket");
  });

  it("returns group concierge menu", () => {
    const res = processGroupBotMessage("233244123456", "menu", true);
    expect(res.replyMessage).toContain("Group concierge");
    expect(res.replyMessage).toContain("gate pass");
  });

  it("simulates group messages via service", () => {
    const ignored = whatsappGroupBotService.simulateGroupMessage({
      text: "See you tonight",
      senderPhone: "233244123456",
    });
    expect(ignored.responded).toBe(false);

    const replied = whatsappGroupBotService.simulateGroupMessage({
      text: "@BaytMiftah 1",
      senderPhone: "233244123456",
      context: {
        tenantUserId: "tenant-1",
        tenantName: "Demo Tenant",
        outstandingMinor: 0,
        currency: "GHS",
        paymentUrl: "https://app.baytmiftah.com/app/payments",
      },
    });
    expect(replied.responded).toBe(true);
    if (replied.responded) {
      expect(replied.bot.replyMessage).toContain("Rent");
    }
  });

  it("processGroupMessage returns null when not mentioned", () => {
    expect(whatsappBusinessBotService.processGroupMessage("233", "hello")).toBeNull();
  });

  it("processGroupMessage handles rent command in group", () => {
    const res = whatsappBusinessBotService.processGroupMessage("233", "@BaytMiftah rent", {
      context: {
        tenantUserId: "tenant-1",
        outstandingMinor: 100000,
        currency: "GHS",
        paymentUrl: "https://app.baytmiftah.com/app/payments",
      },
    });
    expect(res?.actionRequired).toBe("TRIGGER_MOMO");
  });

  it("simulates lease sign command with demo context", () => {
    const res = whatsappGroupBotService.simulateGroupMessage({
      text: "@BaytMiftah 6",
      senderPhone: "233244123456",
      pendingLeaseSignUrl: "https://app.baytmiftah.com/sign/demo",
      pendingLeaseDocumentName: "Lease agreement",
    });
    expect(res.responded).toBe(true);
    if (res.responded) {
      expect(res.bot.actionRequired).toBe("LEASE_SIGN");
      expect(res.bot.replyMessage).toContain("/sign/demo");
    }
  });
});
