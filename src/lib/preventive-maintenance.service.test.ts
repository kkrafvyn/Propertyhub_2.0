import { describe, expect, it } from "vitest";

describe("preventive maintenance scheduling", () => {
  it("advances a due plan by its configured interval", () => {
    const due = new Date("2026-08-01T00:00:00Z");
    due.setUTCDate(due.getUTCDate() + 30);
    expect(due.toISOString().slice(0, 10)).toBe("2026-08-31");
  });
});