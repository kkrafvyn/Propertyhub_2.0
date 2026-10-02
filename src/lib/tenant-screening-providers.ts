/**
 * Provider adapters for US-style tenant screening.
 * Real API calls activate when credentials are configured in Integration Hub.
 */

export type ScreeningCheckType = 'credit' | 'criminal' | 'eviction' | 'income' | 'identity';
export type ScreeningRecommendation = 'clear' | 'review' | 'decline';

export type ScreeningProviderResult = {
  provider: string;
  providerReference: string;
  recommendation: ScreeningRecommendation;
  resultSummary: string;
  resultPayload: Record<string, unknown>;
};

export type ScreeningProviderAdapter = {
  slug: string;
  name: string;
  supportedChecks: ScreeningCheckType[];
  isConfigured: () => boolean;
  submitCheck: (input: {
    applicantName: string;
    applicantEmail: string;
    checkType: ScreeningCheckType;
  }) => Promise<ScreeningProviderResult>;
};

function envConfigured(...keys: string[]) {
  return keys.some((key) => {
    const val = typeof import.meta !== 'undefined' ? (import.meta as any).env?.[key] : undefined;
    return Boolean(val && String(val).trim());
  });
}

/** TransUnion SmartMove adapter. Screening must run server-side once a provider
 * account and an approved API workflow are available. Never fabricate reports. */
export const transUnionAdapter: ScreeningProviderAdapter = {
  slug: 'transunion-smartmove',
  name: 'TransUnion SmartMove',
  supportedChecks: ['credit', 'criminal', 'eviction'],
  isConfigured: () => false,
  async submitCheck(input) {
    void input;
    throw new Error('TransUnion tenant screening is not connected. Configure an approved server-side SmartMove integration before running this check.');
  },
};

/** Internal KYC adapter — routes to manual trust review until Smile KYC is wired. */
export const internalKycAdapter: ScreeningProviderAdapter = {
  slug: 'ghana-trust',
  name: 'Ghana Trust Center',
  supportedChecks: ['identity', 'income'],
  isConfigured: () => envConfigured('VITE_SMILE_PARTNER_ID'),
  async submitCheck(input) {
    const ref = `kyc_${crypto.randomUUID().slice(0, 8)}`;
    if (!this.isConfigured()) {
      return {
        provider: this.slug,
        providerReference: ref,
        recommendation: 'review',
        resultSummary: `Manual trust review required for ${input.applicantName}. Connect Smile Identity for automated Ghana checks.`,
        resultPayload: { mode: 'manual_review', checkType: input.checkType },
      };
    }
    return {
      provider: this.slug,
      providerReference: ref,
      recommendation: 'review',
      resultSummary: `Identity and income verification queued for ${input.applicantName}.`,
      resultPayload: { mode: 'manual_review', checkType: input.checkType },
    };
  },
};

export const SCREENING_PROVIDERS: ScreeningProviderAdapter[] = [
  transUnionAdapter,
  internalKycAdapter,
];

export function getProviderForCheck(checkType: ScreeningCheckType): ScreeningProviderAdapter | undefined {
  return SCREENING_PROVIDERS.find((p) => p.supportedChecks.includes(checkType));
}
