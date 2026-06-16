/** Unified payment finalization — webhooks, success page, demo confirm */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { emitPlatformEvent } from './events.ts'
import { updateEscrowMilestonesFromFunding } from './transaction-engine.ts'
import { recordPaymentLedger } from './ledger.ts'
import { computeTenantIntelligence } from './tenant-intelligence.ts'
import { runEventAutomations } from './event-automation.ts'
import { splitPaymentToProperty } from './property-wallets.ts'

export interface FinalizePaymentInput {
  providerRef?: string
  paymentId?: string
  metadata?: Record<string, string>
  amount?: number
  userId?: string
  provider?: string
}

export async function finalizePayment(
  admin: SupabaseClient,
  input: FinalizePaymentInput,
): Promise<{ ok: boolean; paymentId?: string; alreadyDone?: boolean }> {
  let payment = null

  if (input.paymentId) {
    const { data } = await admin.from('payment_records').select('*').eq('id', input.paymentId).maybeSingle()
    payment = data
  } else if (input.providerRef) {
    const { data } = await admin.from('payment_records').select('*').eq('provider_ref', input.providerRef).maybeSingle()
    payment = data
  }

  const meta = { ...(payment?.metadata ?? {}), ...(input.metadata ?? {}) }
  const paymentId = payment?.id ?? input.paymentId
  const userId = payment?.user_id ?? input.userId
  const amount = Number(input.amount ?? payment?.amount ?? 0)
  const purpose = String(meta.purpose ?? payment?.purpose ?? '')

  if (!paymentId && !input.providerRef) return { ok: false }

  if (payment && (payment.status === 'completed' || payment.status === 'paid')) {
    return { ok: true, paymentId: payment.id, alreadyDone: true }
  }

  if (paymentId) {
    await admin.from('payment_records').update({ status: 'completed' }).eq('id', paymentId)
  } else if (input.providerRef) {
    await admin.from('payment_records').update({ status: 'completed' }).eq('provider_ref', input.providerRef)
  }

  await applyPurposeSideEffects(admin, purpose, meta, input.provider ?? meta.provider, userId)

  if (userId && amount > 0 && paymentId) {
    await recordPaymentLedger(admin, {
      userId,
      amount,
      currency: payment?.currency ?? 'GHS',
      paymentId,
      purpose,
      actorId: userId,
    })

    const propertyId = String(meta.property_id ?? meta.listing_id ?? '')
    if (propertyId && (purpose.includes('rent') || purpose === 'utility')) {
      await splitPaymentToProperty(admin, {
        propertyId,
        amount,
        currency: payment?.currency ?? 'GHS',
        paymentId,
        purpose,
        landlordUserId: meta.landlord_user_id ? String(meta.landlord_user_id) : undefined,
      }).catch(() => {})
    }
  }

  if (userId) {
    await computeTenantIntelligence(admin, userId).catch(() => {})
  }

  await emitPlatformEvent(admin, {
    eventType: 'payment.completed',
    aggregateType: 'payment',
    aggregateId: paymentId ?? input.providerRef ?? 'unknown',
    actorId: userId,
    payload: { purpose, amount, payment_id: paymentId, metadata: meta },
    idempotencyKey: `payment-done-${paymentId ?? input.providerRef}`,
  })

  if (userId) {
    await runEventAutomations(admin, {
      eventType: 'payment.completed',
      userId,
      payload: { purpose, amount, payment_id: paymentId },
    })
  }

  return { ok: true, paymentId: paymentId ?? undefined }
}

async function applyPurposeSideEffects(
  admin: SupabaseClient,
  purpose: string,
  metadata: Record<string, unknown>,
  provider?: string,
  userId?: string,
) {
  const listingId = metadata.listing_id ?? metadata.listingId
  const rentPaymentId = metadata.rent_payment_id
  const billId = metadata.bill_id
  const billIds = metadata.bill_ids as string[] | undefined
  const payRef = metadata.payment_id ?? rentPaymentId

  if (purpose === 'featured_boost' && listingId) {
    await admin.from('listings').update({ featured: true, status: 'active' }).eq('id', String(listingId))
  }

  if ((purpose === 'rent_payment' || purpose === 'rent') && rentPaymentId) {
    await admin.from('rent_payments').update({ status: 'paid', method: provider || 'online' }).eq('id', String(rentPaymentId))
  }

  if (purpose === 'commission_settlement' && metadata.settlement_id) {
    await admin.from('commission_settlements').update({
      status: 'paid',
      paid_at: new Date().toISOString().slice(0, 10),
    }).eq('id', String(metadata.settlement_id))
  }

  if (purpose === 'escrow_deposit' && metadata.escrow_id) {
    const depositAmount = Number(metadata.amount || 0)
    const { data: escrow } = await admin.from('escrow_accounts').select('*').eq('id', String(metadata.escrow_id)).maybeSingle()
    if (escrow) {
      const funded = Number(escrow.funded) + depositAmount
      const status = funded >= Number(escrow.amount) ? 'funded' : 'partial'
      await admin.from('escrow_accounts').update({ funded, status }).eq('id', String(metadata.escrow_id))
      await updateEscrowMilestonesFromFunding(admin, String(metadata.escrow_id), funded)
    }
  }

  if (purpose === 'reservation_payment' && metadata.reservation_id) {
    await admin.from('reservations').update({
      status: 'confirmed',
      payment_id: payRef,
      paid_at: new Date().toISOString(),
    }).eq('id', String(metadata.reservation_id))
    await emitPlatformEvent(admin, {
      eventType: 'reservation.paid',
      aggregateType: 'reservation',
      aggregateId: String(metadata.reservation_id),
      payload: { payment_id: payRef },
      idempotencyKey: `res-paid-${metadata.reservation_id}-${payRef}`,
    })
  }

  if (purpose === 'platform_subscription' && metadata.plan_id && userId) {
    const subId = `sub-${crypto.randomUUID().slice(0, 8)}`
    await admin.from('user_subscriptions').insert({
      id: subId,
      user_id: userId,
      plan_id: String(metadata.plan_id),
      status: 'active',
      provider: provider ?? 'paystack',
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }).catch(() => null)
  }

  if (purpose === 'utility') {
    const ids = Array.isArray(billIds) && billIds.length ? billIds : billId ? [String(billId)] : []
    for (const id of ids) {
      await admin.from('utility_bills').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_id: payRef,
      }).eq('id', id)
      await emitPlatformEvent(admin, {
        eventType: 'utility.bill.paid',
        aggregateType: 'utility_bill',
        aggregateId: id,
        payload: { payment_id: payRef },
        idempotencyKey: `bill-paid-${id}-${payRef ?? 'webhook'}`,
      })
    }
  }
}

export async function finalizePaymentFromWebhook(
  admin: SupabaseClient,
  providerRef: string,
  metadata: Record<string, string>,
) {
  return finalizePayment(admin, {
    providerRef,
    metadata,
    amount: Number(metadata.amount || 0),
    provider: metadata.provider,
  })
}
