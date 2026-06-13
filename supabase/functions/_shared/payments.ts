/** Stripe + Paystack checkout helpers for Edge Functions */

export type PaymentProvider = 'stripe' | 'paystack'

export interface CheckoutInput {
  purpose: string
  amount: number
  currency: string
  provider: PaymentProvider
  userId: string
  userEmail: string
  metadata?: Record<string, unknown>
  successPath?: string
  cancelPath?: string
}

const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'

function toMinorUnits(amount: number, currency: string): number {
  // GHS, USD, NGN — 2 decimal places
  if (['GHS', 'USD', 'NGN', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
    return Math.round(amount * 100)
  }
  return Math.round(amount)
}

export async function createStripeCheckout(input: CheckoutInput) {
  const secret = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secret) return null

  const minor = toMinorUnits(input.amount, input.currency)
  const successUrl = `${SITE_URL}${input.successPath || '/payments/success'}`
  const cancelUrl = `${SITE_URL}${input.cancelPath || '/payments/cancel'}`

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', successUrl)
  params.set('cancel_url', cancelUrl)
  params.set('customer_email', input.userEmail)
  params.set('line_items[0][price_data][currency]', input.currency.toLowerCase())
  params.set('line_items[0][price_data][unit_amount]', String(minor))
  params.set('line_items[0][price_data][product_data][name]', input.purpose.replace(/_/g, ' '))
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[purpose]', input.purpose)
  params.set('metadata[user_id]', input.userId)
  Object.entries(input.metadata || {}).forEach(([k, v]) => {
    params.set(`metadata[${k}]`, String(v))
  })

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Stripe error', data)
    return null
  }

  return { checkout_url: data.url, provider_ref: data.id, provider: 'stripe' as const }
}

export async function createPaystackCheckout(input: CheckoutInput) {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secret) return null

  const minor = toMinorUnits(input.amount, input.currency)
  const callbackUrl = `${SITE_URL}${input.successPath || '/payments/success'}?provider=paystack`

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.userEmail,
      amount: minor,
      currency: input.currency.toUpperCase(),
      callback_url: callbackUrl,
      metadata: {
        purpose: input.purpose,
        user_id: input.userId,
        ...input.metadata,
      },
    }),
  })

  const data = await res.json()
  if (!data.status || !data.data?.authorization_url) {
    console.error('Paystack error', data)
    return null
  }

  return {
    checkout_url: data.data.authorization_url,
    provider_ref: data.data.reference,
    provider: 'paystack' as const,
  }
}

export async function createCheckout(input: CheckoutInput) {
  if (input.provider === 'paystack') {
    return (await createPaystackCheckout(input)) ?? (await createStripeCheckout(input))
  }
  return (await createStripeCheckout(input)) ?? (await createPaystackCheckout(input))
}
