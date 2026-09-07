import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currencyService } from './currency.service';

const fromMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

function mockCurrencyRatesSelect(rows: unknown[] | null) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

describe('currencyService', () => {
  beforeEach(() => {
    fromMock.mockReset();
    invokeMock.mockReset();
  });

  it('returns 1 for identical currencies without network calls', async () => {
    const rate = await currencyService.getExchangeRate('USD', 'USD');
    expect(rate).toBe(1);
    expect(fromMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('reads fresh cached rates from Supabase without invoking edge function', async () => {
    mockCurrencyRatesSelect([
      {
        from: 'GHS',
        to: 'USD',
        rate: 0.08,
        timestamp: Date.now(),
      },
    ]);

    const rate = await currencyService.getExchangeRate('GHS', 'USD');

    expect(rate).toBe(0.08);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('currency_rates');
  });

  it('uses exchange-rates edge function when cache is stale and never upserts from client', async () => {
    mockCurrencyRatesSelect([
      {
        from: 'EUR',
        to: 'GBP',
        rate: 0.85,
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
      },
    ]);

    invokeMock.mockResolvedValue({
      data: { rate: 0.86, timestamp: Date.now() },
      error: null,
    });

    const rate = await currencyService.getExchangeRate('EUR', 'GBP');

    expect(rate).toBe(0.86);
    expect(invokeMock).toHaveBeenCalledWith('exchange-rates', {
      body: { from: 'EUR', to: 'GBP' },
    });

    const upsertCalls = fromMock.mock.results.filter((result) => {
      const value = result.value as { upsert?: unknown } | undefined;
      return typeof value?.upsert === 'function';
    });
    expect(upsertCalls).toHaveLength(0);
  });
});
