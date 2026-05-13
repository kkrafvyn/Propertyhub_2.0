import { supabase } from './supabase';

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  regions: string[];
}

const SUPPORTED_CURRENCIES: Record<string, SupportedCurrency> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true, regions: ['US', 'CA'] },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false, regions: ['EU'] },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false, regions: ['GB', 'UK'] },
  GHS: { code: 'GHS', name: 'Ghana Cedi', symbol: '₵', isDefault: false, regions: ['GH', 'Ghana'] },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', isDefault: false, regions: ['NG', 'Nigeria'] },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', isDefault: false, regions: ['ZA', 'SA'] },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', isDefault: false, regions: ['KE', 'Kenya'] },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', isDefault: false, regions: ['AU'] },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', isDefault: false, regions: ['CA'] },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', isDefault: false, regions: ['JP'] },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', isDefault: false, regions: ['IN'] },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isDefault: false, regions: ['SG'] },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', isDefault: false, regions: ['HK'] },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', isDefault: false, regions: ['AE', 'UAE'] },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', isDefault: false, regions: ['SA'] },
};

// Cache for exchange rates (TTL: 1 hour)
const rateCache = new Map<string, { rate: CurrencyRate; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

class CurrencyService {
  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): SupportedCurrency[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Get currency by code
   */
  getCurrency(code: string): SupportedCurrency | null {
    return SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }

  /**
   * Get exchange rate between two currencies
   * Fetches from Supabase cache or external API
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    from = from.toUpperCase();
    to = to.toUpperCase();

    if (from === to) return 1;

    const cacheKey = `${from}_${to}`;

    // Check cache
    if (rateCache.has(cacheKey)) {
      const cached = rateCache.get(cacheKey)!;
      if (cached.expires > Date.now()) {
        return cached.rate.rate;
      }
      rateCache.delete(cacheKey);
    }

    try {
      // Try to get from Supabase cache
      const { data: cachedRate } = await supabase
        .from('currency_rates')
        .select('*')
        .eq('from', from)
        .eq('to', to)
        .single();

      if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
        rateCache.set(cacheKey, {
          rate: cachedRate,
          expires: Date.now() + CACHE_TTL,
        });
        return cachedRate.rate;
      }

      // Fetch from external API (example: exchangerate-api.com or fixer.io)
      const rate = await this.fetchFromExternalAPI(from, to);

      // Cache in Supabase
      await supabase.from('currency_rates').upsert(
        {
          from,
          to,
          rate,
          timestamp: Date.now(),
        },
        { onConflict: 'from,to' }
      );

      rateCache.set(cacheKey, {
        rate: { from, to, rate, timestamp: Date.now() },
        expires: Date.now() + CACHE_TTL,
      });

      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      // Fallback to default rates
      return this.getDefaultRate(from, to);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (amount <= 0) return 0;
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  /**
   * Format amount in specified currency
   */
  formatCurrency(amount: number, currencyCode: string, locale: string = 'en-US'): string {
    const currency = this.getCurrency(currencyCode);
    if (!currency) return `${amount} ${currencyCode}`;

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toLocaleString(locale)}`;
    }
  }

  /**
   * Get currencies by region/country
   */
  getCurrenciesByRegion(region: string): SupportedCurrency[] {
    const regionUpper = region.toUpperCase();
    return Object.values(SUPPORTED_CURRENCIES).filter((c) =>
      c.regions.some((r) => r.toUpperCase() === regionUpper)
    );
  }

  /**
   * Fetch exchange rate from external API
   * You can use: exchangerate-api.com, fixer.io, or openexchangerates.org
   */
  private async fetchFromExternalAPI(from: string, to: string): Promise<number> {
    // This would integrate with your chosen API
    // For now, returning mock rates
    const mockRates: Record<string, number> = {
      USD_EUR: 0.92,
      USD_GBP: 0.79,
      USD_GHS: 12.5,
      USD_NGN: 1550,
      USD_ZAR: 18.5,
      EUR_USD: 1.09,
      GBP_USD: 1.27,
    };

    const key = `${from}_${to}`;
    if (mockRates[key]) return mockRates[key];

    // Default fallback
    return 1;
  }

  /**
   * Get default rates for fallback
   */
  private getDefaultRate(from: string, to: string): number {
    const defaultRates: Record<string, number> = {
      USD_EUR: 0.92,
      USD_GBP: 0.79,
      USD_GHS: 12.5,
      USD_NGN: 1550,
      USD_ZAR: 18.5,
      EUR_USD: 1.09,
      GBP_USD: 1.27,
      GHS_USD: 0.08,
      NGN_USD: 0.00065,
    };

    const key = `${from}_${to}`;
    if (defaultRates[key]) return defaultRates[key];

    // Reverse rate
    const reverseKey = `${to}_${from}`;
    if (defaultRates[reverseKey]) return 1 / defaultRates[reverseKey];

    return 1;
  }
}

export const currencyService = new CurrencyService();
