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
  EUR: { code: 'EUR', name: 'Euro', symbol: 'EUR ', isDefault: false, regions: ['EU'] },
  GBP: { code: 'GBP', name: 'British Pound', symbol: 'GBP ', isDefault: false, regions: ['GB', 'UK'] },
  GHS: { code: 'GHS', name: 'Ghana Cedi', symbol: 'GHS ', isDefault: false, regions: ['GH', 'Ghana'] },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: 'NGN ', isDefault: false, regions: ['NG', 'Nigeria'] },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', isDefault: false, regions: ['ZA', 'SA'] },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', isDefault: false, regions: ['KE', 'Kenya'] },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', isDefault: false, regions: ['AU'] },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', isDefault: false, regions: ['CA'] },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: 'JPY ', isDefault: false, regions: ['JP'] },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: 'INR ', isDefault: false, regions: ['IN'] },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isDefault: false, regions: ['SG'] },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', isDefault: false, regions: ['HK'] },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', isDefault: false, regions: ['AE', 'UAE'] },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR ', isDefault: false, regions: ['SA'] },
};

const rateCache = new Map<string, { rate: CurrencyRate; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000;

class CurrencyService {
  getSupportedCurrencies(): SupportedCurrency[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  getCurrency(code: string): SupportedCurrency | null {
    return SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    from = from.toUpperCase();
    to = to.toUpperCase();

    if (from === to) return 1;

    const cacheKey = `${from}_${to}`;

    if (rateCache.has(cacheKey)) {
      const cached = rateCache.get(cacheKey)!;
      if (cached.expires > Date.now()) {
        return cached.rate.rate;
      }
      rateCache.delete(cacheKey);
    }

    try {
      const { data: cachedRate } = await supabase
        .from('currency_rates')
        .select('*')
        .eq('from', from)
        .eq('to', to)
        .maybeSingle();

      if (cachedRate && Date.now() - Number(cachedRate.timestamp) < CACHE_TTL) {
        const normalizedRate: CurrencyRate = {
          from: cachedRate.from,
          to: cachedRate.to,
          rate: Number(cachedRate.rate),
          timestamp: Number(cachedRate.timestamp),
        };

        rateCache.set(cacheKey, {
          rate: normalizedRate,
          expires: Date.now() + CACHE_TTL,
        });
        return normalizedRate.rate;
      }

      const rate = await this.fetchFromExternalAPI(from, to);

      rateCache.set(cacheKey, {
        rate: { from, to, rate, timestamp: Date.now() },
        expires: Date.now() + CACHE_TTL,
      });

      return rate;
    } catch {
      const fallbackRate = this.getDefaultRate(from, to);
      rateCache.set(cacheKey, {
        rate: { from, to, rate: fallbackRate, timestamp: Date.now() },
        expires: Date.now() + CACHE_TTL,
      });
      return fallbackRate;
    }
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (amount <= 0) return 0;
    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

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

  getCurrenciesByRegion(region: string): SupportedCurrency[] {
    const regionUpper = region.toUpperCase();
    return Object.values(SUPPORTED_CURRENCIES).filter((currency) =>
      currency.regions.some((value) => value.toUpperCase() === regionUpper)
    );
  }

  private async fetchFromExternalAPI(from: string, to: string): Promise<number> {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Currency API returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      error_type?: string;
    };

    if (payload.result === 'error') {
      throw new Error(payload.error_type || 'Currency API returned an error result');
    }

    const rate = Number(payload.rates?.[to]);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Currency rate missing for ${from} -> ${to}`);
    }

    return rate;
  }

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
      GHS_GBP: 0.063,
      GBP_GHS: 15.87,
      NGN_USD: 0.00065,
    };

    const key = `${from}_${to}`;
    if (defaultRates[key]) return defaultRates[key];

    const reverseKey = `${to}_${from}`;
    if (defaultRates[reverseKey]) return 1 / defaultRates[reverseKey];

    return 1;
  }
}

export const currencyService = new CurrencyService();
