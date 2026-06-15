/** Payment provider selection — plugin-driven, region-aware */

import { resolvePaymentProvider } from './market-context.js'

export const PAYMENT_PROVIDERS = {
  PAYSTACK: 'paystack',
  STRIPE: 'stripe',
  RAZORPAY: 'razorpay',
  BANK_TRANSFER: 'bank_transfer',
}

export const providerMeta = {
  paystack: {
    id: 'paystack',
    label: 'Paystack',
    subtitle: 'Mobile money, bank & cards — Africa',
    badge: 'Africa',
    regions: ['GH', 'NG', 'KE', 'ZA'],
    tier: 'africa',
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    subtitle: 'Cards, ACH, SEPA — US & EU',
    badge: 'Western',
    regions: ['US', 'EU', 'GB', 'INTL'],
    tier: 'western',
  },
  razorpay: {
    id: 'razorpay',
    label: 'Razorpay',
    subtitle: 'UPI, cards, netbanking — India',
    badge: 'Asia',
    regions: ['IN'],
    tier: 'asia',
  },
  bank_transfer: {
    id: 'bank_transfer',
    label: 'Bank transfer',
    subtitle: 'Manual transfer fallback',
    badge: 'Fallback',
    regions: ['INTL'],
    tier: 'all',
  },
}

export function getDefaultProvider(currency = 'GHS') {
  const fromRegion = resolvePaymentProvider()
  if (fromRegion) return fromRegion
  if (currency === 'GHS' || currency === 'NGN') return PAYMENT_PROVIDERS.PAYSTACK
  if (currency === 'INR') return PAYMENT_PROVIDERS.RAZORPAY
  return PAYMENT_PROVIDERS.STRIPE
}

export function getProviderLabel(provider) {
  return providerMeta[provider]?.label ?? provider
}
