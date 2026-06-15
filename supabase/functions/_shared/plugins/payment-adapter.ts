/** Payment adapter router — partner integrations, not hardcoded per country */

import type { RegionConfig } from './types.ts'
import { createCheckout, type CheckoutInput } from '../payments.ts'

export type PaymentAdapterId = 'paystack' | 'stripe' | 'razorpay' | 'bank_transfer'

export function resolvePaymentAdapter(regionConfig: RegionConfig): PaymentAdapterId {
  const def = regionConfig.modules.payment.default
  if (def === 'paystack' || def === 'stripe' || def === 'razorpay' || def === 'bank_transfer') {
    return def
  }
  const currency = regionConfig.region.default_currency
  if (currency === 'GHS' || currency === 'NGN') return 'paystack'
  if (currency === 'INR') return 'razorpay'
  return 'stripe'
}

export async function checkoutViaAdapter(
  regionConfig: RegionConfig,
  input: Omit<CheckoutInput, 'provider'>,
  overrideProvider?: PaymentAdapterId,
) {
  const adapter = overrideProvider ?? resolvePaymentAdapter(regionConfig)

  if (adapter === 'razorpay') {
    // Partner stub — falls through to Stripe until Razorpay keys configured
    const razorpayKey = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKey) {
      return createCheckout({ ...input, provider: 'stripe' })
    }
    // Future: implement Razorpay initialize
    return createCheckout({ ...input, provider: 'stripe' })
  }

  if (adapter === 'bank_transfer') {
    return {
      checkout_url: null,
      provider_ref: `bt-${crypto.randomUUID().slice(0, 8)}`,
      provider: 'bank_transfer' as const,
      message: 'Bank transfer instructions will be sent to your email.',
    }
  }

  return createCheckout({ ...input, provider: adapter === 'paystack' ? 'paystack' : 'stripe' })
}
