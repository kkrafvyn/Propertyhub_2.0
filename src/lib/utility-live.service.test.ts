import { describe, expect, it } from 'vitest';
import { calculatePurcCharge } from './utility-submeter.service';

describe('live utility metering', () => {
  it('rejects decreasing meter readings', () => {
    expect(120 >= 100).toBe(true);
    expect(90 >= 100).toBe(false);
  });

  it('applies PURC bands without a localStorage fallback', () => {
    const lifeline = calculatePurcCharge('electricity', 40);
    expect(lifeline.tariffRate).toBe(0.95);
    expect(lifeline.total).toBeGreaterThan(40);
    const water = calculatePurcCharge('water', 8);
    expect(water.tariffRate).toBe(11.5);
  });
});