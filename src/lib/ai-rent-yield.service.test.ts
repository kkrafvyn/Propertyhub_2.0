import { describe, it, expect } from 'vitest';
import {
  aiRentYieldService,
  GHANA_NEIGHBORHOOD_BENCHMARKS,
} from './ai-rent-yield.service';

describe('AI Rent Yield Predictor & Market Valuation Engine', () => {
  it('loads all core Ghanaian micro-market neighborhood benchmarks', () => {
    const benchmarks = aiRentYieldService.getAllNeighborhoodBenchmarks();
    expect(benchmarks.length).toBeGreaterThanOrEqual(10);

    const names = benchmarks.map((b) => b.name);
    expect(names).toContain('Cantonments');
    expect(names).toContain('Airport Residential Area');
    expect(names).toContain('East Legon (Ambassadorial)');
    expect(names).toContain('Labone');
    expect(names).toContain('Ahodwo / Nhyiaeso (Kumasi)');
    expect(names).toContain('Takoradi Beach Road');
  });

  it('calculates rent and gross yield for a 2-bedroom luxury apartment in Cantonments', () => {
    const prediction = aiRentYieldService.predictRentalYield({
      neighborhood: 'Cantonments',
      propertyType: 'apartment',
      bedrooms: 2,
      areaSqm: 120,
      propertyValuationGHS: 3000000, // GHS 3,000,000 valuation
      hasGenerator: true, // +22%
      hasBorehole: true, // +12%
      isFurnished: true, // +22%
      hasPool: false,
    });

    expect(prediction.neighborhood).toBe('Cantonments');
    expect(prediction.predictedMonthlyRentOptimalGHS).toBeGreaterThan(30000);
    expect(prediction.grossAnnualYieldPct).toBeGreaterThan(10.0);
    expect(prediction.netCapRatePct).toBeGreaterThan(0);
    expect(prediction.featureImpacts.length).toBe(3);

    // Confidence and comps
    expect(prediction.confidenceScorePct).toBeNull();
    expect(prediction.comparableComps.length).toBe(3);
  });

  it('verifies that essential amenities (Generator + Borehole) boost rent and lower days on market', () => {
    const baseWithoutAmenities = aiRentYieldService.predictRentalYield({
      neighborhood: 'East Legon (Ambassadorial)',
      propertyType: 'apartment',
      bedrooms: 3,
      areaSqm: 150,
      propertyValuationGHS: 2500000,
      hasGenerator: false,
      hasBorehole: false,
      isFurnished: false,
    });

    const withAmenities = aiRentYieldService.predictRentalYield({
      neighborhood: 'East Legon (Ambassadorial)',
      propertyType: 'apartment',
      bedrooms: 3,
      areaSqm: 150,
      propertyValuationGHS: 2500000,
      hasGenerator: true,
      hasBorehole: true,
      isFurnished: true,
    });

    expect(withAmenities.predictedMonthlyRentOptimalGHS).toBeGreaterThan(
      baseWithoutAmenities.predictedMonthlyRentOptimalGHS
    );
    expect(withAmenities.grossAnnualYieldPct).toBeGreaterThan(
      baseWithoutAmenities.grossAnnualYieldPct
    );
    expect(withAmenities.projectedDaysOnMarket).toBeLessThan(
      baseWithoutAmenities.projectedDaysOnMarket
    );
  });

  it('determines appropriate investment verdicts based on yield benchmarks', () => {
    // High-yield property (Low valuation relative to rent)
    const highYield = aiRentYieldService.predictRentalYield({
      neighborhood: 'Airport Residential Area',
      propertyType: 'penthouse',
      bedrooms: 3,
      areaSqm: 200,
      propertyValuationGHS: 2000000,
      hasGenerator: true,
      hasBorehole: true,
    });
    expect(['EXCELLENT_YIELD', 'ABOVE_AVERAGE']).toContain(highYield.investmentVerdict);

    // Low-yield property (Overpriced valuation)
    const lowYield = aiRentYieldService.predictRentalYield({
      neighborhood: 'Spintex Road / Coastal',
      propertyType: 'apartment',
      bedrooms: 1,
      areaSqm: 50,
      propertyValuationGHS: 5000000, // Very high valuation for small unit
    });
    expect(lowYield.investmentVerdict).toBe('BELOW_BENCHMARK');
  });
});
