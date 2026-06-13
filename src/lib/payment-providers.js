/** Payment provider selection — Paystack for Africa, Stripe for international */

export const PAYMENT_PROVIDERS = {
  PAYSTACK: 'paystack',
  STRIPE: 'stripe',
}

export const providerMeta = {
  paystack: {
    id: 'paystack',
    label: 'Paystack',
    subtitle: 'Mobile money, bank & cards — Ghana & Africa',
    badge: 'Recommended for GHS',
    regions: ['GH', 'NG', 'KE', 'ZA'],
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    subtitle: 'International cards & diaspora payments',
    badge: 'Global cards',
    regions: ['INTL'],
  },
}

/** Default to Paystack for Ghana-focused platform; Stripe for explicit intl choice */
export function getDefaultProvider(currency = 'GHS') {
  return currency === 'GHS' ? PAYMENT_PROVIDERS.PAYSTACK : PAYMENT_PROVIDERS.STRIPE
}

export function getProviderLabel(provider) {
  return providerMeta[provider]?.label ?? provider
}
