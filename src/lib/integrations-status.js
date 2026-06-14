import { isStripeConfigured } from './payments-config'
import { isSupabaseConfigured } from './supabase'

export async function fetchPaymentIntegrationsStatus() {
  if (!isSupabaseConfigured) {
    return {
      stripe: isStripeConfigured(),
      paystack: false,
      ready: isStripeConfigured(),
      source: 'client',
    }
  }

  try {
    const { callEdgeFunction } = await import('./edge-client')
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: true,
      query: { action: 'config' },
    })
    return { ...payload, source: 'supabase' }
  } catch {
    return {
      stripe: isStripeConfigured(),
      paystack: false,
      ready: isStripeConfigured(),
      source: 'client',
    }
  }
}

export function oauthAvailable() {
  return isSupabaseConfigured
}
