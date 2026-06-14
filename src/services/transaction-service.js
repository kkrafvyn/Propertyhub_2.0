import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { fetchTransactionsFromDb, updateTransactionChecklistInDb } from '../lib/supabase-db'
import { transactions } from '../data/buyer'

export async function fetchTransactions() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchTransactionsFromDb(user.id)
      if (rows?.length) return { transactions: rows, source: 'supabase' }
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

export default { fetchTransactions, updateChecklistItem }
