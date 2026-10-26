import { describe, expect, it } from 'vitest';
import { getAvailabilityConfirmation, parseSearchBounds, publicShortlistIds, withinSearchBounds } from './consumer-discovery';
describe('accurate discovery and public sharing', () => {
  it('does not treat editing or verification as availability confirmation', () => {
    expect(getAvailabilityConfirmation({ updated_at: '2026-01-01', verified_at: '2026-01-01' })).toBeNull();
    expect(getAvailabilityConfirmation({ quality_breakdown: { availabilityConfirmedAt: '2025-01-01T10:00:00Z' } })).toBe('2025-01-01T10:00:00.000Z');
  });
  it('rejects malformed bounds and missing coordinates and supports date-line areas', () => {
    expect(parseSearchBounds(new URLSearchParams('north=99&south=0&east=1&west=0'))).toBeUndefined();
    const bounds = { north: 20, south: -20, east: -170, west: 170 };
    expect(withinSearchBounds(1, 179, bounds)).toBe(true);
    expect(withinSearchBounds(1, 0, bounds)).toBe(false);
    expect(withinSearchBounds(null, null, bounds)).toBe(false);
  });
  it('limits public shortlist IDs without accepting arbitrary URLs or account data', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(publicShortlistIds(`?ids=${id},${id},https://bad.example,foo`)).toEqual([id]);
  });
});
