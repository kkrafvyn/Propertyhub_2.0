import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { fetchTransactionsFromDb, updateTransactionChecklistInDb } from '../lib/supabase-db'
import { transactions } from '../data/buyer'

export async function fetchTransactions() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchTransactionsFromDb(user.id)
      if (rows?.length) {
        return {
          transactions: rows.map(mapTransaction),
          source: 'supabase',
        }
      }
    }
  }

  try {
    const payload = await callEdgeFunction('persistence', {
      allowAnonymous: false,
      query: { action: 'transactions' },
    })
    if (payload?.transactions?.length) return { transactions: payload.transactions, source: 'supabase' }
  } catch { /* fallback */ }
  return { transactions, source: 'local' }
}

function mapTransaction(row) {
  return {
    id: row.id,
    property: row.property,
    stage: row.stage,
    offer: row.offer,
    counter: row.counter,
    closingDate: row.closing_date ?? row.closingDate,
    checklist: row.checklist ?? [],
    escrowId: row.escrow_id ?? row.escrowId,
    listingId: row.listing_id ?? row.listingId,
    offerId: row.offer_id ?? row.offerId,
    commissionSettled: row.commission_settled ?? row.commissionSettled,
  }
}

export async function updateChecklistItem(transactionId, itemId, done) {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { transactions: rows } = await fetchTransactions()
      const tx = rows.find((t) => t.id === transactionId)
      if (tx?.checklist) {
        const checklist = tx.checklist.map((item) =>
          (item.id === itemId ? { ...item, done } : item),
        )
        if (await updateTransactionChecklistInDb(user.id, transactionId, checklist)) {
          return { ok: true, source: 'supabase' }
        }
      }
    }
  }

  try {
    return await callEdgeFunction('persistence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'update_checklist', transaction_id: transactionId, item_id: itemId, done },
    })
  } catch {
    return { ok: true, source: 'local' }
  }
}

export async function advanceTransaction(transactionId, stage) {
  return callEdgeFunction('persistence', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'advance_transaction', transaction_id: transactionId, stage },
  })
}

export async function completeTransaction(transactionId) {
  return callEdgeFunction('persistence', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'complete_transaction', transaction_id: transactionId },
  })
}

export default { fetchTransactions, updateChecklistItem, advanceTransaction, completeTransaction }
