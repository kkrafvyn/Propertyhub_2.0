/** Calendar-day arithmetic for short stays, independent of DST or local clock time. */
export function stayNights(checkIn: string, checkOut: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return 0;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (new Date(start).toISOString().slice(0, 10) !== checkIn || new Date(end).toISOString().slice(0, 10) !== checkOut) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

export function nextStayDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value)) return "";
  return new Date(value + 86400000).toISOString().slice(0, 10);
}
