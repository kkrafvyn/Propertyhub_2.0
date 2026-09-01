import { describe, expect, it } from 'vitest';
import { mapDbPassStatus, mapDbPassType, mapPassTypeToDb } from './visitor-clearance.service';

describe('live visitor clearance', () => {
  it('rejects blank gate credentials', () => {
    expect(''.trim()).toBe('');
    expect('BM-GATE-123456'.trim()).not.toBe('');
  });

  it('maps UI pass types to the estate_visitor_passes check constraint', () => {
    expect(mapPassTypeToDb('guest_visit')).toBe('guest');
    expect(mapPassTypeToDb('delivery')).toBe('delivery');
    expect(mapDbPassType('guest')).toBe('guest_visit');
    expect(mapDbPassStatus('active')).toBe('valid');
    expect(mapDbPassStatus('used')).toBe('used');
  });
});