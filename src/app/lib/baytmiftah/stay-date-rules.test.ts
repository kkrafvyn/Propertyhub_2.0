import { describe, expect, it } from "vitest";
import { nextStayDate, stayNights } from "./stay-date-rules";

describe("short stay calendar rules", () => {
  it("rejects same-day, reversed and invalid date ranges", () => {
    expect(stayNights("2026-12-10", "2026-12-10")).toBe(0);
    expect(stayNights("2026-12-10", "2026-12-09")).toBe(0);
    expect(stayNights("2026-02-30", "2026-03-02")).toBe(0);
    expect(stayNights("not-a-date", "2026-12-12")).toBe(0);
  });
  it("handles DST boundaries and month rollover as calendar days", () => {
    expect(stayNights("2026-03-28", "2026-03-30")).toBe(2);
    expect(stayNights("2026-10-31", "2026-11-02")).toBe(2);
    expect(nextStayDate("2026-12-31")).toBe("2027-01-01");
    expect(nextStayDate("2026-02-28")).toBe("2026-03-01");
  });
});
