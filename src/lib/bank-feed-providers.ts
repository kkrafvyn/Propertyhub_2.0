export type BankFeedProviderId = 'monzo' | 'bank-of-ghana' | 'gtbank' | 'fidelity' | 'standard-chartered';

export type BankFeedProviderConfig = {
  id: BankFeedProviderId;
  label: string;
  requiresAccountId: boolean;
  syncMode: 'polling' | 'webhook' | 'manual';
  supportsReconciliation: boolean;
};

const BANK_FEED_PROVIDERS: Record<BankFeedProviderId, BankFeedProviderConfig> = {
  monzo: {
    id: 'monzo',
    label: 'Monzo',
    requiresAccountId: true,
    syncMode: 'polling',
    supportsReconciliation: true,
  },
  'bank-of-ghana': {
    id: 'bank-of-ghana',
    label: 'Bank of Ghana',
    requiresAccountId: true,
    syncMode: 'webhook',
    supportsReconciliation: true,
  },
  gtbank: {
    id: 'gtbank',
    label: 'GTBank',
    requiresAccountId: true,
    syncMode: 'polling',
    supportsReconciliation: true,
  },
  fidelity: {
    id: 'fidelity',
    label: 'Fidelity Bank',
    requiresAccountId: true,
    syncMode: 'polling',
    supportsReconciliation: true,
  },
  'standard-chartered': {
    id: 'standard-chartered',
    label: 'Standard Chartered',
    requiresAccountId: true,
    syncMode: 'manual',
    supportsReconciliation: true,
  },
};

export function getSupportedBankFeedProviders(): BankFeedProviderConfig[] {
  return Object.values(BANK_FEED_PROVIDERS);
}

export function normaliseBankFeedProvider(value: string | null | undefined): BankFeedProviderId | null {
  if (!value) return null;

  const candidate = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (candidate === 'bank-of-ghana' || candidate === 'bankofghana') return 'bank-of-ghana';
  if (candidate === 'standard-chartered' || candidate === 'standardchartered') return 'standard-chartered';

  const matches = Object.keys(BANK_FEED_PROVIDERS).find((id) => id === candidate);
  return matches ? (matches as BankFeedProviderId) : null;
}

export function getBankFeedProviderConfig(provider: string | null | undefined): BankFeedProviderConfig | null {
  const normalised = normaliseBankFeedProvider(provider);
  if (!normalised) return null;
  return BANK_FEED_PROVIDERS[normalised];
}
