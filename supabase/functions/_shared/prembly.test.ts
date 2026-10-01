import { describe, expect, it } from "vitest";
import {
  getPremblyReference,
  getPremblySubmissionId,
  mapPremblyResult,
  verifyPremblyWebhookSignature,
  selectPremblyVerificationPath,
} from "./prembly.ts";

describe("Prembly result normalization", () => {
  it("only recommends approval for an explicit successful verification", () => {
    expect(mapPremblyResult({ response_code: "00", verification: { status: "VERIFIED" } }).ai_recommendation).toBe("approve");
    expect(mapPremblyResult({ response_code: "01", verification: { status: "VERIFIED" } }).ai_recommendation).toBe("reject");
    expect(mapPremblyResult({ response_code: "00", verification: { status: "NOT-VERIFIED" } }).ai_recommendation).toBe("reject");
    expect(mapPremblyResult({ response_code: "02", verification: { status: "PENDING" } }).ai_recommendation).toBe("review");
  });

  it("extracts a provider reference without depending on one response shape", () => {
    expect(getPremblyReference({ verification: { reference: "ref-1" } })).toBe("ref-1");
    expect(getPremblyReference({ transaction_id: "tx-1" })).toBe("tx-1");
    expect(getPremblyReference({})).toBeNull();
  });

  it("reconciles widget metadata to a KYC submission", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(getPremblySubmissionId({ data: { widget_info: { metadata: { submission_id: id } } } })).toBe(id);
    expect(getPremblySubmissionId({ metadata: { submission_id: "not-a-uuid" } })).toBeNull();
  });

  it("authenticates the raw webhook body", async () => {
    const body = '{"status":"completed"}';
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("public-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    const signature = btoa(String.fromCharCode(...bytes));
    await expect(verifyPremblyWebhookSignature(body, signature, "public-key")).resolves.toBe(true);
    await expect(verifyPremblyWebhookSignature(`${body}x`, signature, "public-key")).resolves.toBe(false);
  });

  it("selects country and document-specific endpoints without accepting URLs", () => {
    const paths = JSON.stringify({ GH: "/verification/gh/id", "GH:passport": "/verification/gh/passport" });
    expect(selectPremblyVerificationPath(paths, "gh", "passport", "/fallback")).toBe("/verification/gh/passport");
    expect(selectPremblyVerificationPath(paths, "GH", "ghana_card", "/fallback")).toBe("/verification/gh/id");
    expect(() => selectPremblyVerificationPath('{"GH":"https://evil.example"}', "GH", "ghana_card", "/fallback")).toThrow();
  });
});
