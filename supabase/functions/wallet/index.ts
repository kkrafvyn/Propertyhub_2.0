import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

async function ensureUserWallet(admin, userId: string) {
  const id = `wal-${userId.slice(0, 8)}`
  const { data } = await admin.from('wallets').select('*').eq('owner_id', userId).eq('owner_type', 'user').maybeSingle()
  if (data) return data
  const row = { id, owner_type: 'user', owner_id: userId, currency: 'GHS', available_balance: 0, pending_balance: 0 }
  await admin.from('wallets').upsert(row)
  return row
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      const wallet = await ensureUserWallet(admin, user.id)

      if (action === 'dashboard' || action === 'transactions') {
        const { data: txs } = await admin.from('wallet_transactions').select('*').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(50)
        return jsonResponse({
          wallet: {
            id: wallet.id,
            currency: wallet.currency,
            availableBalance: Number(wallet.available_balance),
            pendingBalance: Number(wallet.pending_balance),
          },
          transactions: txs ?? [],
          source: 'supabase',
        })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const wallet = await ensureUserWallet(admin, user.id)

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
        return jsonResponse({ ok: true, transaction_id: txId })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
