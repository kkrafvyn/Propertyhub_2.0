import { describe, expect, it } from "vitest";
import {
  isSensitiveBotResponse,
  redactBotReplyForStorage,
} from "./whatsapp-privacy";

describe("whatsapp privacy helpers", () => {
  it("flags lease, gate, and payment responses as sensitive", () => {
    expect(isSensitiveBotResponse("LEASE_SIGN")).toBe(true);
    expect(isSensitiveBotResponse("DISPATCH_GATE_PIN")).toBe(true);
    expect(isSensitiveBotResponse("TRIGGER_MOMO")).toBe(true);
    expect(isSensitiveBotResponse("ALERT_MANAGER")).toBe(false);
  });

  it("redacts signing URLs from stored bot replies", () => {
    const stored = redactBotReplyForStorage(
      "Sign here: https://app.example/sign/abc",
      "LEASE_SIGN",
    );
    expect(stored).not.toContain("https://");
    expect(stored).toMatch(/privately/i);
  });

  it("redacts gate PIN from stored bot replies", () => {
    const stored = redactBotReplyForStorage("PIN: 4829", "DISPATCH_GATE_PIN");
    expect(stored).not.toContain("4829");
  });
});
