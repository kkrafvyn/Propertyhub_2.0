import { describe, expect, it } from "vitest";
import { sanitizePublicDocumentUrl } from "./sanitize-document-url";

describe("sanitizePublicDocumentUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizePublicDocumentUrl("https://cdn.example.com/lease.pdf")).toBe(
      "https://cdn.example.com/lease.pdf",
    );
  });

  it("rejects http and javascript URLs", () => {
    expect(sanitizePublicDocumentUrl("http://example.com/doc.pdf")).toBeNull();
    expect(sanitizePublicDocumentUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for empty values", () => {
    expect(sanitizePublicDocumentUrl("")).toBeNull();
    expect(sanitizePublicDocumentUrl(null)).toBeNull();
  });
});
