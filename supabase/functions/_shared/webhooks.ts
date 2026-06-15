/** Stripe + Paystack webhook handlers */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { finalizePaymentFromWebhook } from './payment-completion.ts'

export async function handleStripeWebhook(req: Request, admin: SupabaseClient) {
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (webhookSecret) {
    const sig = req.headers.get('stripe-signature')
    if (!sig) return { ok: false, status: 400, message: 'Missing signature' }
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(body)
  } catch {
    return { ok: false, status: 400, message: 'Invalid JSON' }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const metadata = (session.metadata as Record<string, string>) || {}
    const ref = String(session.id || '')
    const amount = Number(session.amount_total ?? 0) / 100
    if (ref) {
      await finalizePaymentFromWebhook(admin, ref, {
        ...metadata,
        provider: 'stripe',
        amount: String(amount || metadata.amount || 0),
        payment_id: metadata.payment_id,
      })
    }
  }

  return { ok: true, status: 200, message: 'received' }
}

export async function handlePaystackWebhook(req: Request, admin: SupabaseClient) {
  const body = await req.text()
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')

  if (secret) {
    const hash = req.headers.get('x-paystack-signature')
    if (hash) {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign'],
      )
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
      if (computed !== hash) {
        return { ok: false, status: 401, message: 'Invalid signature' }
      }
    }
  }

  let event: { event: string; data: { reference: string; metadata: Record<string, string>; amount: number } }
  try {
    event = JSON.parse(body)
  } catch {
    return { ok: false, status: 400, message: 'Invalid JSON' }
  }

  if (event.event === 'charge.success') {
    const ref = event.data.reference
    const metadata = event.data.metadata || {}
    await finalizePaymentFromWebhook(admin, ref, {
      ...metadata,
      provider: 'paystack',
      amount: String(event.data.amount / 100),
      payment_id: metadata.payment_id,
    })
  }

  return { ok: true, status: 200, message: 'received' }
}
