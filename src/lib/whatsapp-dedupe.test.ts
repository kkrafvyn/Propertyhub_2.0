import { describe, expect, it } from "vitest";
import { resolveWhatsAppDedupeId } from "./whatsapp-dedupe";

describe("resolveWhatsAppDedupeId", () => {
  it("prefers Meta message id when present", () => {
    expect(
      resolveWhatsAppDedupeId({
        messageId: "wamid.abc",
        organizationId: "org-1",
      }),
    ).toBe("wamid.abc");
  });

  it("builds synthetic id when message id missing", () => {
    const a = resolveWhatsAppDedupeId({
      organizationId: "org-1",
      senderPhone: "+233",
      messageText: "hello",
      timestamp: "2026-01-01T00:00:00Z",
    });
    const b = resolveWhatsAppDedupeId({
      organizationId: "org-1",
      senderPhone: "+233",
      messageText: "hello",
      timestamp: "2026-01-01T00:00:00Z",
    });
    expect(a).toMatch(/^syn:org-1:/);
    expect(a).toBe(b);
  });

  it("returns null when insufficient data for synthetic id", () => {
    expect(resolveWhatsAppDedupeId({ organizationId: "org-1" })).toBeNull();
  });
});
