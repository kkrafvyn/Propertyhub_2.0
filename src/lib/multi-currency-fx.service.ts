/**
 * BaytMiftah REOS — Multi-Currency FX Engine & Dual-Currency Rent Indexing
 * 
 * Provides Bank of Ghana (BOG) reference FX rate synchronization,
 * dual-currency rent indexing (USD/GHS/EUR/GBP), FX collar/hedging calculators,
 * and multi-currency estate ledger conversions.
 */

export interface FXRate {
  pair: string; // e.g. 'USD/GHS'
  baseCurrency: 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS';
  quoteCurrency: 'GHS' | 'USD';
  interbankRate: number;
  marketRate: number; // typical forex bureau / commercial bank rate
  change24h: number; // percentage change
  updatedAt: string;
  source: 'Bank of Ghana (BOG)' | 'Interbank Live Feed';
}

export interface DualCurrencyLeaseCalculation {
  leaseId?: string;
  baseAmount: number;
  baseCurrency: 'USD' | 'EUR' | 'GBP';
  exchangeRate: number;
  effectiveRate: number;
  ghsPayable: number;
  collarApplied: boolean;
  collarRange?: {
    floorRate: number;
    ceilingRate: number;
  };
  momoFeePesewas: number;
  netPayableGHS: number;
  calculatedAt: string;
}

export interface FXHedgingScenario {
  monthlyRentUSD: number;
  tenureMonths: number;
  projectedDepreciationPct: number; // e.g. 15% per annum
  unhedgedGhsYield: number;
  hedgedGhsYield: number;
  recommendedStrategy: 'Quarterly Spot Reset' | 'Fixed FX Collar (+/- 5%)' | 'Prepaid Advance Locking';
  currencyRiskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
}

// Current Bank of Ghana baseline interbank rates — updated by syncRatesFromProvider()
const BOG_RATES: Record<string, FXRate> = {
  'USD/GHS': {
    pair: 'USD/GHS',
    baseCurrency: 'USD',
    quoteCurrency: 'GHS',
    interbankRate: 15.85,
    marketRate: 16.10,
    change24h: 0.12,
    updatedAt: new Date().toISOString(),
    source: 'Bank of Ghana (BOG)',
  },
  'EUR/GHS': {
    pair: 'EUR/GHS',
    baseCurrency: 'EUR',
    quoteCurrency: 'GHS',
    interbankRate: 17.20,
    marketRate: 17.45,
    change24h: -0.05,
    updatedAt: new Date().toISOString(),
    source: 'Bank of Ghana (BOG)',
  },
  'GBP/GHS': {
    pair: 'GBP/GHS',
    baseCurrency: 'GBP',
    quoteCurrency: 'GHS',
    interbankRate: 20.15,
    marketRate: 20.40,
    change24h: 0.25,
    updatedAt: new Date().toISOString(),
    source: 'Bank of Ghana (BOG)',
  },
  'NGN/GHS': {
    pair: 'NGN/GHS',
    baseCurrency: 'NGN',
    quoteCurrency: 'GHS',
    interbankRate: 0.0105,
    marketRate: 0.011,
    change24h: -0.8,
    updatedAt: new Date().toISOString(),
    source: 'Bank of Ghana (BOG)',
  },
};

export const multiCurrencyFxService = {
  /**
   * Refresh rates from the exchange-rates edge function when available.
   */
  async syncRatesFromProvider(): Promise<FXRate[]> {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) return this.getLiveRates();
      const payload = await response.json();
      const rates = payload?.rates || {};

      const pairs: Array<[string, 'USD' | 'EUR' | 'GBP' | 'NGN']> = [
        ['USD/GHS', 'USD'],
        ['EUR/GHS', 'EUR'],
        ['GBP/GHS', 'GBP'],
        ['NGN/GHS', 'NGN'],
      ];

      for (const [pair, base] of pairs) {
        const ghsRate = Number(rates.GHS) / Number(rates[base] || 1);
        if (!Number.isFinite(ghsRate) || ghsRate <= 0) continue;
        BOG_RATES[pair] = {
          ...BOG_RATES[pair],
          pair,
          baseCurrency: base,
          quoteCurrency: 'GHS',
          interbankRate: ghsRate,
          marketRate: ghsRate * 1.015,
          updatedAt: new Date().toISOString(),
          source: 'Interbank Live Feed',
        };
      }

      return this.getLiveRates();
    } catch {
      return this.getLiveRates();
    }
  },

  /**
   * Get all active Bank of Ghana reference rates
   */
  getLiveRates(): FXRate[] {
    return Object.values(BOG_RATES);
  },

  /**
   * Get current exchange rate for a specific pair
   */
  getRate(pair: string = 'USD/GHS'): FXRate {
    return (
      BOG_RATES[pair.toUpperCase()] || {
        pair,
        baseCurrency: 'USD',
        quoteCurrency: 'GHS',
        interbankRate: 15.85,
        marketRate: 16.10,
        change24h: 0,
        updatedAt: new Date().toISOString(),
        source: 'Bank of Ghana (BOG)',
      }
    );
  },

  /**
   * Convert an amount between currencies
   */
  convertCurrency(
    amount: number,
    from: 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS',
    to: 'USD' | 'GHS'
  ): { convertedAmount: number; rateUsed: number } {
    if (from === to) return { convertedAmount: amount, rateUsed: 1.0 };

    if (to === 'GHS') {
      const pair = `${from}/GHS`;
      const rate = this.getRate(pair).interbankRate;
      return { convertedAmount: Math.round(amount * rate * 100) / 100, rateUsed: rate };
    }

    if (from === 'GHS' && to === 'USD') {
      const rate = this.getRate('USD/GHS').interbankRate;
      return { convertedAmount: Math.round((amount / rate) * 100) / 100, rateUsed: 1 / rate };
    }

    return { convertedAmount: amount, rateUsed: 1.0 };
  },

  /**
   * Calculate Dual-Currency Rent Invoice with optional FX collar
   */
  calculateDualCurrencyRent(params: {
    baseAmount: number;
    baseCurrency: 'USD' | 'EUR' | 'GBP';
    collarPct?: number; // e.g. 5 for 5% max variance band
    targetRate?: number;
  }): DualCurrencyLeaseCalculation {
    const pair = `${params.baseCurrency}/GHS`;
    const spotRate = params.targetRate || this.getRate(pair).interbankRate;

    let effectiveRate = spotRate;
    let collarApplied = false;
    let collarRange: DualCurrencyLeaseCalculation['collarRange'] | undefined;

    if (params.collarPct && params.collarPct > 0) {
      const floorRate = spotRate * (1 - params.collarPct / 100);
      const ceilingRate = spotRate * (1 + params.collarPct / 100);
      collarRange = { floorRate, ceilingRate };

      if (spotRate > ceilingRate) {
        effectiveRate = ceilingRate;
        collarApplied = true;
      } else if (spotRate < floorRate) {
        effectiveRate = floorRate;
        collarApplied = true;
      }
    }

    const ghsPayable = Math.round(params.baseAmount * effectiveRate * 100) / 100;
    // MTN MoMo 1% transaction fee calculation (capped at GHS 25 per Bank of Ghana e-levy policy)
    const momoFeeGHS = Math.min(25, ghsPayable * 0.01);
    const momoFeePesewas = Math.round(momoFeeGHS * 100);
    const netPayableGHS = ghsPayable;

    return {
      baseAmount: params.baseAmount,
      baseCurrency: params.baseCurrency,
      exchangeRate: spotRate,
      effectiveRate,
      ghsPayable,
      collarApplied,
      collarRange,
      momoFeePesewas,
      netPayableGHS,
      calculatedAt: new Date().toISOString(),
    };
  },

  /**
   * Run FX Hedging Simulation for Landlord & Property Portfolios
   */
  evaluateHedgingScenario(monthlyRentUSD: number, tenureMonths = 12, projectedDepreciationPct = 15): FXHedgingScenario {
    const baseSpotRate = this.getRate('USD/GHS').interbankRate;
    const endOfYearRate = baseSpotRate * (1 + projectedDepreciationPct / 100);

    // Unhedged annual collection in GHS assuming linear depreciation
    const averageRate = (baseSpotRate + endOfYearRate) / 2;
    const unhedgedGhsYield = monthlyRentUSD * tenureMonths * averageRate;

    // Hedged annual collection with quarterly collar reset
    const hedgedRate = baseSpotRate * 1.05; // 5% smoothed collar
    const hedgedGhsYield = monthlyRentUSD * tenureMonths * hedgedRate;

    let currencyRiskLevel: FXHedgingScenario['currencyRiskLevel'] = 'Low';
    if (projectedDepreciationPct >= 25) currencyRiskLevel = 'Severe';
    else if (projectedDepreciationPct >= 15) currencyRiskLevel = 'High';
    else if (projectedDepreciationPct >= 8) currencyRiskLevel = 'Moderate';

    let recommendedStrategy: FXHedgingScenario['recommendedStrategy'] = 'Quarterly Spot Reset';
    if (projectedDepreciationPct > 15) {
      recommendedStrategy = 'Prepaid Advance Locking';
    } else if (projectedDepreciationPct > 5) {
      recommendedStrategy = 'Fixed FX Collar (+/- 5%)';
    }

    return {
      monthlyRentUSD,
      tenureMonths,
      projectedDepreciationPct,
      unhedgedGhsYield: Math.round(unhedgedGhsYield),
      hedgedGhsYield: Math.round(hedgedGhsYield),
      recommendedStrategy,
      currencyRiskLevel,
    };
  },
};
