import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { recordLedgerEntry } from '../_shared/ledger.ts'
import { ensurePropertyWallet } from '../_shared/property-wallets.ts'

type WalletPurpose = 'general' | 'rent' | 'utility' | 'escrow'

async function ensureUserWallet(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  purpose: WalletPurpose = 'general',
  currency = 'GHS',
) {
  const prefix = purpose === 'general' ? 'wal' : `wal-${purpose.slice(0, 4)}`
  const id = `${prefix}-${userId.slice(0, 8)}`
  const { data } = await admin
    .from('wallets')
    .select('*')
    .eq('owner_id', userId)
    .eq('owner_type', 'user')
    .eq('wallet_purpose', purpose)
    .eq('currency', currency)
    .maybeSingle()
  if (data) return data
  const row = {
    id,
    owner_type: 'user',
    owner_id: userId,
    currency,
    wallet_purpose: purpose,
    available_balance: 0,
    pending_balance: 0,
  }
  await admin.from('wallets').upsert(row)
  return row
}

async function ensureAllWallets(admin: ReturnType<typeof createAdminClient>, userId: string, currency = 'GHS') {
  const purposes: WalletPurpose[] = ['general', 'rent', 'utility', 'escrow']
  const wallets = []
  for (const purpose of purposes) {
    wallets.push(await ensureUserWallet(admin, userId, purpose, currency))
  }
  return wallets
}

function mapWallet(row: Record<string, unknown>) {
  return {
    id: row.id,
    purpose: row.wallet_purpose ?? 'general',
    currency: row.currency,
    availableBalance: Number(row.available_balance),
    pendingBalance: Number(row.pending_balance),
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const purpose = (url.searchParams.get('purpose') ?? 'general') as WalletPurpose
  const currency = url.searchParams.get('currency') ?? 'GHS'

  try {
    if (req.method === 'GET') {
      if (action === 'all') {
        const wallets = await ensureAllWallets(admin, user.id, currency)
        return jsonResponse({ wallets: wallets.map(mapWallet), source: 'supabase' })
      }

      if (action === 'property') {
        const propertyId = url.searchParams.get('property_id')
        if (!propertyId) return errorResponse('property_id required', 400)
        const purpose = (url.searchParams.get('purpose') ?? 'rent') as 'rent' | 'utility' | 'general'
        const wallet = await ensurePropertyWallet(admin, propertyId, currency, purpose)
        const { data: txs } = await admin.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(30)
        return jsonResponse({ wallet: mapWallet(wallet), transactions: txs ?? [], source: 'supabase' })
      }

      const wallet = await ensureUserWallet(admin, user.id, purpose, currency)

      if (action === 'dashboard' || action === 'transactions') {
        const { data: txs } = await admin.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(50)
        const allWallets = await ensureAllWallets(admin, user.id, currency)
        return jsonResponse({
          wallet: mapWallet(wallet),
          wallets: allWallets.map(mapWallet),
          transactions: txs ?? [],
          source: 'supabase',
        })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const walletPurpose = (body.purpose ?? purpose) as WalletPurpose
      const wallet = await ensureUserWallet(admin, user.id, walletPurpose, body.currency ?? currency)

      if (body.action === 'withdraw') {
        const amount = Number(body.amount)
        if (!amount || amount <= 0) return errorResponse('Invalid amount', 400)
        if (Number(wallet.available_balance) < amount) return errorResponse('Insufficient balance', 400)

        const txId = `wt-${crypto.randomUUID().slice(0, 8)}`
        await admin.from('wallet_transactions').insert({
          id: txId,
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount,
          status: 'pending',
          description: `Withdrawal via ${body.provider ?? 'paystack'}`,
        })
        await admin.from('wallets').update({
          available_balance: Number(wallet.available_balance) - amount,
          pending_balance: Number(wallet.pending_balance) + amount,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id)

        await emitPlatformEvent(admin, {
          eventType: 'wallet.debited',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          actorId: user.id,
          payload: { amount, type: 'withdrawal', transaction_id: txId },
          idempotencyKey: `wallet-debit-${txId}`,
        })

        return jsonResponse({ ok: true, transaction_id: txId })
      }

      if (body.action === 'credit') {
        const amount = Number(body.amount)
        const txId = `wt-${crypto.randomUUID().slice(0, 8)}`
        await admin.from('wallet_transactions').insert({
          id: txId,
          wallet_id: wallet.id,
          type: body.type ?? 'deposit',
          amount,
          status: 'completed',
          reference_type: body.reference_type,
          reference_id: body.reference_id,
          description: body.description ?? 'Wallet credit',
        })
        await admin.from('wallets').update({
          available_balance: Number(wallet.available_balance) + amount,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id)

        await recordLedgerEntry(admin, {
          entryType: 'credit',
          accountType: walletPurpose === 'utility' ? 'utility' : walletPurpose === 'rent' ? 'rent' : 'user_wallet',
          accountId: user.id,
          amount,
          currency: wallet.currency,
          referenceType: 'wallet_transaction',
          referenceId: txId,
          idempotencyKey: `wallet-credit-${txId}`,
          description: body.description ?? 'Wallet credit',
          actorId: user.id,
        })

        await emitPlatformEvent(admin, {
          eventType: 'wallet.credited',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          actorId: user.id,
          payload: { amount, type: body.type ?? 'deposit', transaction_id: txId },
          idempotencyKey: `wallet-credit-evt-${txId}`,
        })

        return jsonResponse({ ok: true, transaction_id: txId })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
