export function assertFutureViewing(value: string, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time <= now) throw new Error("Choose a future date and time.");
  return new Date(time);
}
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
export function buildViewingCalendar(input: { id: string; title: string; location: string; start: string; duration: number }) {
  const start = new Date(input.start);
  if (!Number.isFinite(start.getTime())) throw new Error("Viewing time is unavailable.");
  const minutes = Number.isFinite(input.duration) && input.duration > 0 ? input.duration : 45;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BaytMiftah//Viewings//EN", "BEGIN:VEVENT", `UID:${escape(input.id)}@baytmiftah.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + minutes * 60000))}`, `SUMMARY:${escape(input.title)}`, `LOCATION:${escape(input.location)}`, "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Property viewing in one hour", "END:VALARM", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
