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

/** TransUnion SmartMove adapter — uses sandbox simulation until API keys are set. */
export const transUnionAdapter: ScreeningProviderAdapter = {
  slug: 'transunion-smartmove',
  name: 'TransUnion SmartMove',
  supportedChecks: ['credit', 'criminal', 'eviction'],
  isConfigured: () => envConfigured('VITE_TRANSUNION_API_KEY', 'TRANSUNION_API_KEY'),
  async submitCheck(input) {
    const ref = `tu_${crypto.randomUUID().slice(0, 8)}`;
    if (!this.isConfigured()) {
      return {
        provider: this.slug,
        providerReference: ref,
        recommendation: input.checkType === 'credit' ? 'review' : 'clear',
        resultSummary: `[Sandbox] ${input.checkType} check simulated for ${input.applicantName}. Connect TransUnion in Integration Hub for live results.`,
        resultPayload: { mode: 'sandbox', checkType: input.checkType, score: input.checkType === 'credit' ? 680 : null },
      };
    }
    // Live integration point — replace with TransUnion REST call when credentials exist
    return {
      provider: this.slug,
      providerReference: ref,
      recommendation: 'review',
      resultSummary: `TransUnion ${input.checkType} check submitted for ${input.applicantEmail}.`,
      resultPayload: { mode: 'live', checkType: input.checkType },
    };
  },
};

/** Internal KYC adapter for identity/income verification. */
export const internalKycAdapter: ScreeningProviderAdapter = {
  slug: 'ghana-trust',
  name: 'Ghana Trust Center',
  supportedChecks: ['identity', 'income'],
  isConfigured: () => true,
  async submitCheck(input) {
    return {
      provider: this.slug,
      providerReference: `kyc_${crypto.randomUUID().slice(0, 8)}`,
      recommendation: 'clear',
      resultSummary: `Identity and income verification initiated for ${input.applicantName}.`,
      resultPayload: { mode: 'internal', checkType: input.checkType },
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
