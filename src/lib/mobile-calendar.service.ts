interface CalendarViewingInput {
  title: string;
  startsAt?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  description?: string | null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toCalendarDate(value: Date) {
  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
    "T",
    pad(value.getUTCHours()),
    pad(value.getUTCMinutes()),
    pad(value.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeIcsText(value?: string | null) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export const mobileCalendarService = {
  buildIcs(input: CalendarViewingInput) {
    const start = input.startsAt ? new Date(input.startsAt) : new Date();
    const end = new Date(start.getTime() + (input.durationMinutes || 45) * 60 * 1000);
    const uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `baytmiftah-viewing-${start.getTime()}`;

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BaytMiftah//Mobile Viewing//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toCalendarDate(new Date())}`,
      `DTSTART:${toCalendarDate(start)}`,
      `DTEND:${toCalendarDate(end)}`,
      `SUMMARY:${escapeIcsText(input.title)}`,
      `LOCATION:${escapeIcsText(input.location)}`,
      `DESCRIPTION:${escapeIcsText(input.description || "BaytMiftah viewing")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  },

  downloadIcs(input: CalendarViewingInput) {
    if (typeof document === "undefined") return;

    const blob = new Blob([this.buildIcs(input)], {
      type: "text/calendar;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = href;
    link.download = "baytmiftah-viewing.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  },

  getGoogleCalendarUrl(input: CalendarViewingInput) {
    const start = input.startsAt ? new Date(input.startsAt) : new Date();
    const end = new Date(start.getTime() + (input.durationMinutes || 45) * 60 * 1000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: input.title,
      dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
      details: input.description || "BaytMiftah viewing",
      location: input.location || "",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  },
};
