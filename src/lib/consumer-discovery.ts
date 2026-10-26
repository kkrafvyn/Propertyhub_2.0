export interface SearchBounds { north: number; south: number; east: number; west: number }
export function parseSearchBounds(params: URLSearchParams): SearchBounds | undefined {
  const keys = ['north', 'south', 'east', 'west'] as const;
  if (!keys.every((key) => params.has(key) && params.get(key)?.trim())) return undefined;
  const [north, south, east, west] = keys.map((key) => Number(params.get(key)));
  if (![north,south,east,west].every(Number.isFinite) || north > 90 || south < -90 || south > north || Math.abs(east) > 180 || Math.abs(west) > 180) return undefined;
  return { north, south, east, west };
}
export function withinSearchBounds(lat: unknown, lng: unknown, bounds: SearchBounds) {
  if (lat == null || lng == null || lat === '' || lng === '') return false;
  const y = Number(lat); const x = Number(lng);
  return Number.isFinite(y) && Number.isFinite(x) && y >= bounds.south && y <= bounds.north && (bounds.west <= bounds.east ? x >= bounds.west && x <= bounds.east : x >= bounds.west || x <= bounds.east);
}
export function getAvailabilityConfirmation(listing: any): string | null {
  const value = listing?.quality_breakdown?.availabilityConfirmedAt;
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) && date.getTime() <= Date.now() ? date.toISOString() : null;
}
export function publicShortlistIds(search: string): string[] {
  return [...new Set(new URLSearchParams(search).get('ids')?.split(',').filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) || [])].slice(0, 12);
}
