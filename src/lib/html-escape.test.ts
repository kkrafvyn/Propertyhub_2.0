import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("neutralizes script injection payloads", () => {
    const payload = '<img src=x onerror="alert(1)">';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;img");
  });

  it("escapes ampersands first", () => {
    expect(escapeHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });
});
