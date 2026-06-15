/** Stripe + Paystack + Razorpay webhook handlers */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { finalizePaymentFromWebhook } from './payment-completion.ts'

const WEBHOOK_TOLERANCE_SEC = 300

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(',').map((p) => p.trim())
  let timestamp = ''
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') signatures.push(value)
  }

  if (!timestamp || signatures.length === 0) return false

  const age = Math.floor(Date.now() / 1000) - Number(timestamp)
  if (Number.isNaN(age) || age > WEBHOOK_TOLERANCE_SEC) return false

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')

  return signatures.some((s) => timingSafeEqual(s, expected))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

export async function handleStripeWebhook(req: Request, admin: SupabaseClient) {
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (webhookSecret) {
    const sig = req.headers.get('stripe-signature')
    if (!sig) return { ok: false, status: 400, message: 'Missing signature' }
    const valid = await verifyStripeSignature(body, sig, webhookSecret)
    if (!valid) return { ok: false, status: 401, message: 'Invalid signature' }
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
    if (!hash) return { ok: false, status: 401, message: 'Missing signature' }
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    if (!timingSafeEqual(computed, hash)) {
      return { ok: false, status: 401, message: 'Invalid signature' }
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

export async function handleRazorpayWebhook(req: Request, admin: SupabaseClient) {
  const body = await req.text()
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

  if (secret) {
    const sig = req.headers.get('x-razorpay-signature')
    if (!sig) return { ok: false, status: 401, message: 'Missing signature' }
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const computed = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
    if (!timingSafeEqual(computed, sig)) {
      return { ok: false, status: 401, message: 'Invalid signature' }
    }
  }

  let event: {
    event: string
    payload: {
      payment?: { entity: { id: string; amount: number; notes: Record<string, string> } }
      payment_link?: { entity: { id: string; notes: Record<string, string> } }
    }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return { ok: false, status: 400, message: 'Invalid JSON' }
  }

  if (event.event === 'payment.captured' || event.event === 'payment_link.paid') {
    const payment = event.payload.payment?.entity
    const link = event.payload.payment_link?.entity
    const notes = payment?.notes ?? link?.notes ?? {}
    const ref = link?.id ?? payment?.id ?? ''
    const amount = payment ? Number(payment.amount) / 100 : Number(notes.amount ?? 0)

    if (ref) {
      await finalizePaymentFromWebhook(admin, ref, {
        ...notes,
        provider: 'razorpay',
        amount: String(amount || notes.amount || 0),
        payment_id: notes.payment_id,
      })
    }
  }

  return { ok: true, status: 200, message: 'received' }
}
