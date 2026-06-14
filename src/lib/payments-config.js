export const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

export function isStripeConfigured() {
  return Boolean(stripePublishableKey?.startsWith('pk_'))
}

export function isPaystackConfigured() {
  return true
}

export function getPaymentsMode() {
  if (isStripeConfigured()) return 'stripe_ready'
  return 'edge_secrets_required'
}
