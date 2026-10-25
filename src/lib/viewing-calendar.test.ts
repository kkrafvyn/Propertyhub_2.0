import { describe, expect, it } from "vitest";
import { assertFutureViewing, buildViewingCalendar } from "./viewing-calendar";
describe("viewing appointments", () => {
  it("rejects invalid and past requests before database writes", () => {
    const now = new Date("2026-10-25T12:00:00Z").getTime();
    for (const value of ["", "bad", "2026-10-25T12:00:00Z"]) expect(() => assertFutureViewing(value, now)).toThrow();
    expect(assertFutureViewing("2026-10-26T12:00:00Z", now).toISOString()).toBe("2026-10-26T12:00:00.000Z");
  });
  it("exports a timezone-independent appointment with escaped content and reminder", () => {
    const file = buildViewingCalendar({ id: "view-1", title: "Home, viewing", location: "Accra\nRoom 2", start: "2026-10-26T10:00:00+02:00", duration: 45 });
    expect(file).toContain("DTSTART:20261026T080000Z\r\nDTEND:20261026T084500Z");
    expect(file).toContain("SUMMARY:Home\\, viewing");
    expect(file).toContain("LOCATION:Accra\\nRoom 2");
    expect(file).toContain("TRIGGER:-PT1H");
    expect(() => buildViewingCalendar({ id: "1", title: "Home", location: "", start: "bad", duration: 0 })).toThrow();
  });
});
