/** Transaction + offer state machine for buyer purchase workflow */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { emitPlatformEvent } from './events.ts'
import { logAudit } from './user-seed.ts'
import { advanceLeadForTransaction, resolveListingAgent } from './agent-crm.ts'

export const OFFER_STATUSES = ['pending', 'countered', 'accepted', 'rejected', 'withdrawn'] as const
export const TX_STAGES = ['viewing', 'offer', 'negotiation', 'accepted', 'escrow', 'inspection', 'closing', 'completed'] as const

export function defaultChecklist(stage: string) {
  return [
    { id: 'viewing', label: 'Property viewing completed', done: stage !== 'viewing' },
    { id: 'offer', label: 'Offer submitted', done: ['offer', 'negotiation', 'accepted', 'escrow', 'inspection', 'closing', 'completed'].includes(stage) },
    { id: 'accepted', label: 'Offer accepted', done: ['accepted', 'escrow', 'inspection', 'closing', 'completed'].includes(stage) },
    { id: 'escrow', label: 'Escrow funded', done: ['inspection', 'closing', 'completed'].includes(stage) },
    { id: 'inspection', label: 'Inspection complete', done: ['closing', 'completed'].includes(stage) },
    { id: 'docs', label: 'Documents collected', done: stage === 'completed' },
    { id: 'close', label: 'Closing completed', done: stage === 'completed' },
  ]
}

export async function logTransactionEvent(
  admin: SupabaseClient,
  transactionId: string,
  eventType: string,
  actorId: string | null,
  payload: Record<string, unknown> = {},
) {
  await admin.from('transaction_events').insert({
    id: `te-${crypto.randomUUID().slice(0, 8)}`,
    transaction_id: transactionId,
    event_type: eventType,
    actor_id: actorId,
    payload,
  }).catch(() => null)
}

export async function ensureTransactionForOffer(
  admin: SupabaseClient,
  userId: string,
  offer: { id: string; property: string; amount: number; listing_id?: string | null },
) {
  const txId = `tx-${offer.id.replace(/^offer-/, '')}`
  const { data: existing } = await admin.from('transactions').select('id').eq('id', txId).maybeSingle()
  if (existing) return txId

  const row = {
    id: txId,
    user_id: userId,
    offer_id: offer.id,
    listing_id: offer.listing_id ?? null,
    property: offer.property,
    stage: 'offer',
    offer: String(offer.amount),
    checklist: defaultChecklist('offer'),
  }
  await admin.from('transactions').upsert(row)
  await admin.from('offers').update({ transaction_id: txId }).eq('id', offer.id)
  await logTransactionEvent(admin, txId, 'transaction.created', userId, { offer_id: offer.id })
  return txId
}

export async function createEscrowForTransaction(
  admin: SupabaseClient,
  tx: { id: string; property: string; listing_id?: string | null; user_id: string },
  offerAmount: number,
) {
  const depositTotal = Math.round(offerAmount * 0.1)
  const escrowId = `esc-${crypto.randomUUID().slice(0, 8)}`
  await admin.from('escrow_accounts').insert({
    id: escrowId,
    property: tx.property,
    buyer_id: tx.user_id,
    transaction_id: tx.id,
    listing_id: tx.listing_id ?? null,
    amount: depositTotal,
    funded: 0,
    status: 'partial',
    provider: 'paystack',
  })

  const splits = [
    { label: 'Initial deposit', pct: 0.5, order: 1 },
    { label: 'Due diligence', pct: 0.3, order: 2 },
    { label: 'Closing balance', pct: 0.2, order: 3 },
  ]
  for (const s of splits) {
    await admin.from('escrow_milestones').insert({
      id: `em-${crypto.randomUUID().slice(0, 8)}`,
      escrow_id: escrowId,
      label: s.label,
      amount: Math.round(depositTotal * s.pct),
      status: 'pending',
      sort_order: s.order,
    })
  }

  await admin.from('transactions').update({
    escrow_id: escrowId,
    stage: 'escrow',
    checklist: defaultChecklist('escrow'),
  }).eq('id', tx.id)

  await logTransactionEvent(admin, tx.id, 'escrow.created', tx.user_id, { escrow_id: escrowId, amount: depositTotal })
  return escrowId
}

export async function updateEscrowMilestonesFromFunding(
  admin: SupabaseClient,
  escrowId: string,
  fundedTotal: number,
) {
  const { data: milestones } = await admin
    .from('escrow_milestones')
    .select('*')
    .eq('escrow_id', escrowId)
    .order('sort_order')

  let cumulative = 0
  for (const m of milestones ?? []) {
    cumulative += Number(m.amount)
    const status = fundedTotal >= cumulative ? 'funded' : 'pending'
    if (m.status !== status && status === 'funded') {
      await admin.from('escrow_milestones').update({ status: 'funded' }).eq('id', m.id)
    }
  }

  const tx = await admin.from('transactions').select('id, checklist').eq('escrow_id', escrowId).maybeSingle()
  if (tx?.data) {
    const { data: escrow } = await admin.from('escrow_accounts').select('amount, funded').eq('id', escrowId).maybeSingle()
    if (escrow && Number(escrow.funded) >= Number(escrow.amount)) {
      const checklist = (tx.data.checklist as { id: string; done: boolean }[]).map((item) =>
        item.id === 'escrow' ? { ...item, done: true } : item,
      )
      await admin.from('transactions').update({
        stage: 'inspection',
        checklist: defaultChecklist('inspection').map((item) => {
          const prev = checklist.find((c) => c.id === item.id)
          return prev ? { ...item, done: prev.done || item.done } : item
        }),
      }).eq('id', tx.data.id)
    }
  }
}

export async function completeTransaction(
  admin: SupabaseClient,
  transactionId: string,
  actorId: string,
) {
  const { data: tx } = await admin.from('transactions').select('*').eq('id', transactionId).maybeSingle()
  if (!tx) throw new Error('Transaction not found')
  if (tx.stage === 'completed') return { ok: true, already: true }

  await admin.from('transactions').update({
    stage: 'completed',
    checklist: defaultChecklist('completed'),
    closing_date: new Date().toISOString().slice(0, 10),
  }).eq('id', transactionId)

  await logTransactionEvent(admin, transactionId, 'transaction.completed', actorId, {})
  await logAudit(admin, actorId, 'transaction_completed', transactionId, {})

  if (!tx.commission_settled) {
    await createCommissionSettlement(admin, tx, actorId)
  }

  await advanceLeadForTransaction(admin, transactionId, 'closed')

  await emitPlatformEvent(admin, {
    eventType: 'transaction.completed',
    aggregateType: 'transaction',
    aggregateId: transactionId,
    actorId,
    payload: { property: tx.property, listing_id: tx.listing_id },
    idempotencyKey: `tx-complete-${transactionId}`,
  })

  return { ok: true }
}

async function createCommissionSettlement(
  admin: SupabaseClient,
  tx: Record<string, unknown>,
  actorId: string,
) {
  const offerAmount = Number(String(tx.offer ?? '0').replace(/[^\d.]/g, '')) || 0
  const commission = Math.round(offerAmount * 0.025)
  if (commission <= 0) return

  let agentId: string | null = null
  let agentName = 'Listing agent'
  if (tx.listing_id) {
    const { data: listing } = await admin.from('listings').select('submitted_by, host').eq('id', String(tx.listing_id)).maybeSingle()
    if (listing?.host) agentName = String(listing.host)
    agentId = listing?.submitted_by ?? null
    if (agentId) {
      await admin.from('transactions').update({ agent_id: agentId }).eq('id', String(tx.id))
    }
  }

  const { data: profile } = agentId
    ? await admin.from('user_profiles').select('agency_id').eq('id', agentId).maybeSingle()
    : { data: null }

  const id = `cs-${crypto.randomUUID().slice(0, 8)}`
  await admin.from('commission_settlements').insert({
    id,
    agent_id: agentId,
    agent_name: agentName,
    property: tx.property,
    amount: commission,
    status: 'pending',
    provider: 'paystack',
    transaction_id: tx.id,
    listing_id: tx.listing_id ?? null,
    offer_id: tx.offer_id ?? null,
    agency_id: profile?.agency_id ?? null,
  }).catch(() => null)

  await admin.from('transactions').update({ commission_settled: true }).eq('id', String(tx.id))
  await logTransactionEvent(admin, String(tx.id), 'commission.created', actorId, { settlement_id: id, amount: commission })
}

export async function transitionOffer(
  admin: SupabaseClient,
  offerId: string,
  action: 'counter' | 'accept' | 'reject' | 'withdraw',
  actorId: string,
  payload: { counter_amount?: number; counter_notes?: string } = {},
) {
  const { data: offer } = await admin.from('offers').select('*').eq('id', offerId).maybeSingle()
  if (!offer) throw new Error('Offer not found')

  if (action === 'withdraw') {
    if (offer.user_id !== actorId) throw new Error('Forbidden')
    await admin.from('offers').update({ status: 'withdrawn', updated: new Date().toISOString().slice(0, 10) }).eq('id', offerId)
    return { ok: true, status: 'withdrawn' }
  }

  if (action === 'counter') {
    const counterAmount = Number(payload.counter_amount)
    if (!counterAmount) throw new Error('counter_amount required')
    await admin.from('offers').update({
      status: 'countered',
      counter_amount: counterAmount,
      counter_notes: payload.counter_notes ?? null,
      updated: new Date().toISOString().slice(0, 10),
    }).eq('id', offerId)

    const txId = offer.transaction_id ?? await ensureTransactionForOffer(admin, offer.user_id, offer)
    await admin.from('transactions').update({
      stage: 'negotiation',
      counter: String(counterAmount),
      checklist: defaultChecklist('negotiation'),
    }).eq('id', txId)
    await logTransactionEvent(admin, txId, 'offer.countered', actorId, { counter_amount: counterAmount })
    return { ok: true, status: 'countered', transaction_id: txId }
  }

  if (action === 'reject') {
    await admin.from('offers').update({ status: 'rejected', updated: new Date().toISOString().slice(0, 10) }).eq('id', offerId)
    if (offer.transaction_id) {
      await logTransactionEvent(admin, offer.transaction_id, 'offer.rejected', actorId, {})
    }
    return { ok: true, status: 'rejected' }
  }

  if (action === 'accept') {
    const { data: listing } = offer.listing_id
      ? await admin.from('listings').select('submitted_by, owner_id').eq('id', offer.listing_id).maybeSingle()
      : { data: null }
    const isOwner = listing && (listing.submitted_by === actorId || listing.owner_id === actorId)
    const isBuyerAcceptingCounter = offer.user_id === actorId && offer.status === 'countered'
    if (!isOwner && !isBuyerAcceptingCounter) {
      throw new Error('Only the listing owner or buyer (for counter offers) can accept')
    }

    await admin.from('offers').update({ status: 'accepted', updated: new Date().toISOString().slice(0, 10) }).eq('id', offerId)
    const txId = offer.transaction_id ?? await ensureTransactionForOffer(admin, offer.user_id, offer)
    const agentId = listing?.submitted_by ?? await resolveListingAgent(admin, offer.listing_id)
    if (agentId) {
      await admin.from('transactions').update({ agent_id: agentId }).eq('id', txId)
    }
    const { data: tx } = await admin.from('transactions').select('*').eq('id', txId).single()
    await admin.from('transactions').update({
      stage: 'accepted',
      checklist: defaultChecklist('accepted'),
    }).eq('id', txId)

    const escrowId = await createEscrowForTransaction(admin, { ...tx, user_id: offer.user_id }, Number(offer.counter_amount ?? offer.amount))
    await advanceLeadForTransaction(admin, txId, 'offer')
    await logTransactionEvent(admin, txId, 'offer.accepted', actorId, { escrow_id: escrowId })
    return { ok: true, status: 'accepted', transaction_id: txId, escrow_id: escrowId }
  }

  throw new Error('Invalid action')
}
