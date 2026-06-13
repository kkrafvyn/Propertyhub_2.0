import { callEdgeFunction } from '../lib/edge-client'
import { transactions } from '../data/buyer'

export async function fetchTransactions() {
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
