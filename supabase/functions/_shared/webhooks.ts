/** Stripe + Paystack webhook handlers */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function completePayment(
  admin: SupabaseClient,
  providerRef: string,
  metadata: Record<string, string>,
) {
  await admin
    .from('payment_records')
    .update({ status: 'paid' })
    .eq('provider_ref', providerRef)

  const purpose = metadata.purpose || metadata.Purpose
  const listingId = metadata.listing_id || metadata.listingId
  const rentPaymentId = metadata.rent_payment_id

  if (purpose === 'featured_boost' && listingId) {
    await admin.from('listings').update({ featured: true, status: 'active' }).eq('id', listingId)
  }

  if (purpose === 'rent_payment' && rentPaymentId) {
    await admin.from('rent_payments').update({ status: 'paid', method: metadata.provider || 'online' }).eq('id', rentPaymentId)
  }

  if (purpose === 'escrow_deposit' && metadata.escrow_id) {
    const amount = Number(metadata.amount || 0)
    const { data: escrow } = await admin.from('escrow_accounts').select('*').eq('id', metadata.escrow_id).maybeSingle()
    if (escrow) {
      const funded = Number(escrow.funded) + amount
      const status = funded >= Number(escrow.amount) ? 'funded' : 'partial'
      await admin.from('escrow_accounts').update({ funded, status }).eq('id', metadata.escrow_id)
    }
  }
}

export async function handleStripeWebhook(req: Request, admin: SupabaseClient) {
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (webhookSecret) {
    const sig = req.headers.get('stripe-signature')
    if (!sig) return { ok: false, status: 400, message: 'Missing signature' }
    // Production: verify with crypto.subtle — for now parse if signature present
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
    if (ref) await completePayment(admin, ref, { ...metadata, provider: 'stripe' })
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
    await completePayment(admin, ref, { ...metadata, provider: 'paystack', amount: String(event.data.amount / 100) })
  }

  return { ok: true, status: 200, message: 'received' }
}
