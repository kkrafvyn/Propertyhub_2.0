import { describe, expect, it } from 'vitest';
import {
  getSupportedBankFeedProviders,
  normaliseBankFeedProvider,
  getBankFeedProviderConfig,
} from './bank-feed-providers';

describe('bank feed provider integration contract', () => {
  it('exposes only supported provider adapters', () => {
    const providers = getSupportedBankFeedProviders();
    expect(providers.map((provider) => provider.id)).toContain('monzo');
    expect(providers.map((provider) => provider.id)).toContain('bank-of-ghana');
    expect(providers.some((provider: any) => provider.id === 'bogus')).toBe(false);
  });

  it('normalises and validates provider names deterministically', () => {
    expect(normaliseBankFeedProvider(' Monzo ')).toBe('monzo');
    expect(normaliseBankFeedProvider('BANK OF GHANA')).toBe('bank-of-ghana');
    expect(normaliseBankFeedProvider('not-supported')).toBeNull();
  });

  it('returns the expected configuration payload for a supported provider', () => {
    const config = getBankFeedProviderConfig('monzo');
    expect(config).toMatchObject({
      id: 'monzo',
      requiresAccountId: true,
      syncMode: 'polling',
    });
  });
});
