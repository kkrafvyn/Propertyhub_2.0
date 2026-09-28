import { describe, expect, it } from "vitest";
import {
  confirmSmileSignature,
  generateSmileSignature,
  getSmileWebhookSignatureHeaders,
  mapSmileResult,
} from "./smile-identity.ts";

describe("Smile Identity webhook authentication", () => {
  it("reads signature values from the documented response headers", () => {
    const headers = new Headers({
      "Response-Timestamp": " 2026-09-27T10:00:00.000Z ",
      "Response-Signature": " signature-value ",
    });

    expect(getSmileWebhookSignatureHeaders(headers)).toEqual({
      timestamp: "2026-09-27T10:00:00.000Z",
      signature: "signature-value",
    });
  });

  it("rejects callbacks with missing signature headers", () => {
    expect(getSmileWebhookSignatureHeaders(new Headers())).toEqual({ timestamp: "", signature: "" });
  });

  it("verifies the timestamp-bound HMAC and rejects a modified signature", async () => {
    const timestamp = "2026-09-27T10:00:00.000Z";
    const signed = await generateSmileSignature("partner-1", "test-api-key", timestamp);

    await expect(confirmSmileSignature("partner-1", "test-api-key", timestamp, signed.signature)).resolves.toBe(true);
    await expect(confirmSmileSignature("partner-1", "test-api-key", timestamp, `${signed.signature}x`)).resolves.toBe(false);
  });

  it("never maps a negative verification result to approval", () => {
    expect(mapSmileResult({ ResultText: "Not verified" }).ai_recommendation).toBe("reject");
    expect(mapSmileResult({ ResultCode: 1013, ResultText: "Verified" }).ai_recommendation).toBe("reject");
    expect(mapSmileResult({ ResultCode: 1012, ResultText: "Verified" }).ai_recommendation).toBe("approve");
    expect(mapSmileResult({ ResultText: "Manual review required" }).ai_recommendation).toBe("review");
  });
});