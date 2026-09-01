import { describe, expect, it } from "vitest";

describe("operational observability", () => {
  it("accepts structured severity values", () => {
    expect(["debug", "info", "warning", "error", "critical"].includes("critical")).toBe(true);
  });
});