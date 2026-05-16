import { describe, expect, it } from "vitest";
import { mobileCalendarService } from "./mobile-calendar.service";

describe("mobileCalendarService", () => {
  it("builds an ICS invite for a property viewing", () => {
    const ics = mobileCalendarService.buildIcs({
      title: "Property viewing: Airport Residential Apartment",
      startsAt: "2026-06-01T10:00:00.000Z",
      durationMinutes: 45,
      location: "Airport Residential, Accra",
      description: "Meet the agent at reception.",
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Property viewing: Airport Residential Apartment");
    expect(ics).toContain("DTSTART:20260601T100000Z");
    expect(ics).toContain("DTEND:20260601T104500Z");
  });

  it("builds a Google Calendar URL", () => {
    const url = mobileCalendarService.getGoogleCalendarUrl({
      title: "Property viewing",
      startsAt: "2026-06-01T10:00:00.000Z",
      location: "Accra",
    });

    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("Property+viewing");
  });
});
