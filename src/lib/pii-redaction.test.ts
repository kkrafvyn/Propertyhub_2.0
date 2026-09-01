import { describe, expect, it } from "vitest";
import { containsPii, redactPii } from "./pii-redaction";

describe("PII redaction", () => {
  it("redacts emails, Ghana Card, phones, and account numbers before LLM forwarding", () => {
    const raw =
      "Contact ama@example.com or +233 24 123 4567. Ghana Card GHA-123456789-1. Account number 144100298102.";
    const redacted = redactPii(raw);
    expect(redacted).not.toContain("ama@example.com");
    expect(redacted).not.toContain("GHA-123456789-1");
    expect(redacted).toContain("[redacted-email]");
    expect(redacted).toContain("[redacted-ghana-card]");
    expect(containsPii(raw)).toBe(true);
    expect(containsPii("no secrets here")).toBe(false);
  });
});
