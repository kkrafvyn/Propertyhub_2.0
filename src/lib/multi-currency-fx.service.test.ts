import { describe, it, expect } from 'vitest';
import { multiCurrencyFxService } from './multi-currency-fx.service';

describe('multiCurrencyFxService', () => {
  describe('getLiveRates & getRate', () => {
    it('returns Bank of Ghana benchmark rates for major pairs', () => {
      const rates = multiCurrencyFxService.getLiveRates();
      expect(rates.length).toBeGreaterThanOrEqual(4);

      const usdGhs = multiCurrencyFxService.getRate('USD/GHS');
      expect(usdGhs.baseCurrency).toBe('USD');
      expect(usdGhs.quoteCurrency).toBe('GHS');
      expect(usdGhs.interbankRate).toBeGreaterThan(10);
      expect(usdGhs.source).toContain('Bank of Ghana');
    });
  });

  describe('convertCurrency', () => {
    it('converts USD to GHS using live interbank exchange rate', () => {
      const { convertedAmount, rateUsed } = multiCurrencyFxService.convertCurrency(1000, 'USD', 'GHS');
      expect(rateUsed).toBe(15.85);
      expect(convertedAmount).toBe(15850);
    });

    it('converts GHS back to USD accurately', () => {
      const { convertedAmount } = multiCurrencyFxService.convertCurrency(15850, 'GHS', 'USD');
      expect(convertedAmount).toBe(1000);
    });

    it('returns identity when from and to currencies match', () => {
      const { convertedAmount, rateUsed } = multiCurrencyFxService.convertCurrency(500, 'GHS', 'GHS');
      expect(convertedAmount).toBe(500);
      expect(rateUsed).toBe(1.0);
    });
  });

  describe('calculateDualCurrencyRent', () => {
    it('calculates GHS equivalent for USD pegged rent', () => {
      const res = multiCurrencyFxService.calculateDualCurrencyRent({
        baseAmount: 2000,
        baseCurrency: 'USD',
      });

      expect(res.baseAmount).toBe(2000);
      expect(res.ghsPayable).toBe(31700); // 2000 * 15.85
      expect(res.collarApplied).toBe(false);
      expect(res.netPayableGHS).toBe(31700);
    });

    it('applies FX collar bounds when volatility exceeds threshold', () => {
      const res = multiCurrencyFxService.calculateDualCurrencyRent({
        baseAmount: 1000,
        baseCurrency: 'USD',
        collarPct: 5,
        targetRate: 20.0, // High deviation above collar ceiling
      });

      expect(res.collarRange).toBeDefined();
      expect(res.exchangeRate).toBe(20.0);
    });
  });

  describe('evaluateHedgingScenario', () => {
    it('generates unhedged vs hedged yields and risk recommendations', () => {
      const scenario = multiCurrencyFxService.evaluateHedgingScenario(3000, 12, 15);
      expect(scenario.monthlyRentUSD).toBe(3000);
      expect(scenario.tenureMonths).toBe(12);
      expect(scenario.currencyRiskLevel).toBe('High');
      expect(scenario.unhedgedGhsYield).toBeGreaterThan(0);
      expect(scenario.hedgedGhsYield).toBeGreaterThan(0);
      expect(scenario.recommendedStrategy).toBeDefined();
    });
  });
});
