import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { demoWallet, demoWalletTransactions } from '../data/os-platform'

async function ensureWallet(userId) {
  const id = `wal-${userId.slice(0, 8)}`
  if (!supabase) return { ...demoWallet, id }

  const { data } = await supabase.from('wallets').select('*').eq('owner_id', userId).eq('owner_type', 'user').maybeSingle()
  if (data) return mapWallet(data)

  const row = {
    id,
    owner_type: 'user',
    owner_id: userId,
    currency: 'GHS',
    available_balance: 0,
    pending_balance: 0,
  }
  await supabase.from('wallets').upsert(row)
  return mapWallet(row)
}

function mapWallet(row) {
  return {
    id: row.id,
    purpose: row.purpose ?? row.wallet_purpose ?? 'general',
    currency: row.currency,
    availableBalance: Number(row.availableBalance ?? row.available_balance),
    pendingBalance: Number(row.pendingBalance ?? row.pending_balance),
  }
}

export async function fetchWalletDashboard() {
  try {
    const payload = await callEdgeFunction('wallet', { allowAnonymous: false, query: { action: 'dashboard' } })
    if (payload?.wallet) {
      return {
        wallet: mapWallet(payload.wallet),
        wallets: (payload.wallets ?? [payload.wallet]).map(mapWallet),
        transactions: (payload.transactions ?? []).map(mapTx),
        source: payload.source ?? 'supabase',
      }
    }
  } catch { /* fallback */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const wallet = await ensureWallet(user.id)
      const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(20)
      return {
        wallet,
        transactions: (txs ?? []).map(mapTx),
        source: 'supabase',
      }
    }
  }

  return { wallet: demoWallet, transactions: demoWalletTransactions, source: 'local' }
}

function mapTx(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    status: row.status,
    description: row.description,
    created_at: row.created_at?.slice?.(0, 10) ?? row.created_at,
  }
}

export async function fetchWalletTransactions() {
  const { transactions } = await fetchWalletDashboard()
  return { transactions, source: 'merged' }
}

export async function requestWalletWithdrawal({ amount, provider = 'paystack' }) {
  try {
    return await callEdgeFunction('wallet', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'withdraw', amount, provider },
    })
  } catch (error) {
    return { ok: false, error: error.message, demo: true }
  }
}
