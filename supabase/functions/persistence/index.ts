import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureBuyerData, logAudit } from '../_shared/user-seed.ts'
import {
  completeTransaction,
  defaultChecklist,
  ensureTransactionForOffer,
  logTransactionEvent,
  transitionOffer,
  updateEscrowMilestonesFromFunding,
} from '../_shared/transaction-engine.ts'

function mapTransaction(row: Record<string, unknown>) {
  return {
    id: row.id,
    property: row.property,
    stage: row.stage,
    offer: row.offer,
    counter: row.counter,
    closingDate: row.closing_date,
    checklist: row.checklist ?? [],
    offerId: row.offer_id,
    listingId: row.listing_id,
    escrowId: row.escrow_id,
    commissionSettled: row.commission_settled,
  }
}

function mapOffer(row: Record<string, unknown>) {
  return {
    id: row.id,
    property: row.property,
    amount: row.amount,
    status: row.status,
    counterAmount: row.counter_amount,
    counterNotes: row.counter_notes,
    listingId: row.listing_id,
    transactionId: row.transaction_id,
    notes: row.notes,
    updated: row.updated,
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureBuyerData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'documents') {
        const { data } = await admin.from('user_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        const documents = (data ?? []).map((r) => ({
          id: r.id, name: r.name, category: r.category, status: r.status, url: r.storage_path, signedAt: r.signed_at,
        }))
        return jsonResponse({ documents, source: 'supabase' })
      }

      if (action === 'transactions') {
        const { data } = await admin.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ transactions: (data ?? []).map(mapTransaction), source: 'supabase' })
      }

      if (action === 'offers') {
        const { data } = await admin.from('offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ offers: (data ?? []).map(mapOffer), source: 'supabase' })
      }

      if (action === 'incoming_offers') {
        const { data: listings } = await admin
          .from('listings')
          .select('id')
          .or(`submitted_by.eq.${user.id},owner_id.eq.${user.id}`)
        const listingIds = (listings ?? []).map((l) => l.id)
        if (!listingIds.length) return jsonResponse({ offers: [], source: 'supabase' })

        const { data } = await admin
          .from('offers')
          .select('*')
          .in('listing_id', listingIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
        return jsonResponse({ offers: (data ?? []).map(mapOffer), source: 'supabase' })
      }

      if (action === 'compare') {
        const { data } = await admin.from('compare_listings').select('listing_id').eq('user_id', user.id)
        return jsonResponse({ ids: (data ?? []).map((r) => r.listing_id), source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'create_offer') {
        const offer = body.offer ?? {}
        const listingId = body.listing_id ?? offer.listingId ?? offer.listing_id ?? null
        const row = {
          id: offer.id ?? `o-${crypto.randomUUID().slice(0, 8)}`,
          user_id: user.id,
          property: offer.property,
          listing_id: listingId,
          amount: offer.amount,
          status: offer.status ?? 'pending',
          notes: offer.notes ?? '',
          updated: offer.updated ?? new Date().toISOString().slice(0, 10),
        }
        const { data, error } = await admin.from('offers').insert(row).select('*').single()
        if (error) return errorResponse(error.message, 400)
        await ensureTransactionForOffer(admin, user.id, { id: data.id, property: data.property, amount: Number(data.amount), listing_id: listingId })
        await logAudit(admin, user.id, 'offer_created', row.id, { listing_id: listingId })
        return jsonResponse({ ok: true, offer: mapOffer(data) })
      }

      if (body.action === 'update_offer') {
        const result = await transitionOffer(admin, body.offer_id, body.offer_action, user.id, {
          counter_amount: body.counter_amount,
          counter_notes: body.counter_notes,
        })
        const { data } = await admin.from('offers').select('*').eq('id', body.offer_id).maybeSingle()
        return jsonResponse({ ...result, offer: data ? mapOffer(data) : null })
      }

      if (body.action === 'complete_transaction') {
        const result = await completeTransaction(admin, body.transaction_id, user.id)
        const { data: settlement } = await admin
          .from('commission_settlements')
          .select('id, amount, status')
          .eq('transaction_id', body.transaction_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return jsonResponse({ ...result, settlement: settlement ?? null })
      }

      if (body.action === 'advance_transaction') {
        const stages = ['viewing', 'offer', 'negotiation', 'accepted', 'escrow', 'inspection', 'closing', 'completed']
        const { data: tx } = await admin.from('transactions').select('*').eq('id', body.transaction_id).eq('user_id', user.id).maybeSingle()
        if (!tx) return errorResponse('Transaction not found', 404)
        const idx = stages.indexOf(String(tx.stage))
        const nextStage = body.stage ?? stages[Math.min(idx + 1, stages.length - 1)]
        if (nextStage === 'completed') {
          return jsonResponse(await completeTransaction(admin, body.transaction_id, user.id))
        }
        await admin.from('transactions').update({
          stage: nextStage,
          checklist: defaultChecklist(nextStage),
        }).eq('id', body.transaction_id)
        await logTransactionEvent(admin, body.transaction_id, 'transaction.advanced', user.id, { stage: nextStage })
        return jsonResponse({ ok: true, stage: nextStage })
      }

      if (body.action === 'update_checklist') {
        const { data: tx } = await admin.from('transactions').select('checklist').eq('id', body.transaction_id).eq('user_id', user.id).maybeSingle()
        if (!tx) return errorResponse('Transaction not found', 404)
        const checklist = (tx.checklist as { id: string; done: boolean }[]).map((item) =>
          item.id === body.item_id ? { ...item, done: body.done } : item,
        )
        await admin.from('transactions').update({ checklist }).eq('id', body.transaction_id)
        return jsonResponse({ ok: true, transaction_id: body.transaction_id, item_id: body.item_id, done: body.done })
      }

      if (body.action === 'toggle_compare') {
        const listingId = body.listing_id
        const { data: existing } = await admin.from('compare_listings').select('listing_id').eq('user_id', user.id).eq('listing_id', listingId).maybeSingle()
        if (existing) {
          await admin.from('compare_listings').delete().eq('user_id', user.id).eq('listing_id', listingId)
          return jsonResponse({ ok: true, saved: false })
        }
        const { count } = await admin.from('compare_listings').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if ((count ?? 0) >= 4) return errorResponse('Compare limit reached (4)', 400)
        await admin.from('compare_listings').insert({ user_id: user.id, listing_id: listingId })
        return jsonResponse({ ok: true, saved: true })
      }

      if (body.action === 'save_document') {
        const row = {
          user_id: user.id,
          name: body.name,
          category: body.category ?? 'general',
          storage_path: body.storage_path,
          status: body.status ?? 'uploaded',
        }
        const { data, error } = await admin.from('user_documents').insert(row).select('*').single()
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ ok: true, document: data })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
