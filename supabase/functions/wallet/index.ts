import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { recordLedgerEntry } from '../_shared/ledger.ts'
import { ensurePropertyWallet } from '../_shared/property-wallets.ts'
import { ensurePaystackRecipient, initiatePaystackTransfer } from '../_shared/paystack-transfer.ts'

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

      if (action === 'payout_accounts') {
        const { data } = await admin.from('payout_accounts').select('*').eq('user_id', user.id)
        return jsonResponse({ accounts: data ?? [], source: 'supabase' })
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

        const provider = body.provider ?? 'paystack'
        const txId = `wt-${crypto.randomUUID().slice(0, 8)}`

        const { data: payoutAccount } = await admin
          .from('payout_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!payoutAccount?.account_ref) {
          return errorResponse('Save a payout account before withdrawing', 400)
        }

        let transferStatus = 'pending'
        let providerRef: string | null = null
        let transferError: string | null = null

        if (provider === 'paystack') {
          const recipient = await ensurePaystackRecipient({
            name: payoutAccount.account_name ?? user.email?.split('@')[0] ?? 'Wallet user',
            accountNumber: payoutAccount.account_ref,
            accountType: payoutAccount.account_type ?? 'mobile_money',
            bankCode: payoutAccount.bank_code ?? 'MTN',
            currency: wallet.currency ?? 'GHS',
            existingRecipientCode: payoutAccount.paystack_recipient_code,
          })

          if (recipient.ok) {
            if (recipient.created) {
              await admin.from('payout_accounts').update({
                paystack_recipient_code: recipient.recipient_code,
              }).eq('id', payoutAccount.id)
            }

            const transfer = await initiatePaystackTransfer({
              amount,
              recipientCode: recipient.recipient_code,
              reason: 'BaytMiftah wallet withdrawal',
              reference: txId,
              currency: wallet.currency ?? 'GHS',
            })

            if (transfer.ok) {
              transferStatus = transfer.status === 'success' ? 'completed' : 'pending'
              providerRef = transfer.transfer_code ?? transfer.reference
            } else {
              transferError = transfer.error
              transferStatus = 'failed'
            }
          } else {
            transferError = recipient.error
            transferStatus = 'failed'
          }
        }

        if (transferStatus === 'failed') {
          return errorResponse(transferError ?? 'Withdrawal transfer failed', 400)
        }

        await admin.from('wallet_transactions').insert({
          id: txId,
          wallet_id: wallet.id,
          type: 'withdrawal',
          amount,
          status: transferStatus,
          provider_ref: providerRef,
          description: `Withdrawal via ${provider}${providerRef ? ` · ${providerRef}` : ''}`,
        })

        const pendingDelta = transferStatus === 'completed' ? 0 : amount
        const completedDebit = transferStatus === 'completed'

        await admin.from('wallets').update({
          available_balance: Number(wallet.available_balance) - amount,
          pending_balance: completedDebit
            ? Number(wallet.pending_balance)
            : Number(wallet.pending_balance) + pendingDelta,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id)

        if (transferStatus === 'pending') {
          await admin.from('wallet_holds').insert({
            id: `wh-${crypto.randomUUID().slice(0, 8)}`,
            wallet_id: wallet.id,
            amount,
            reason: 'withdrawal_pending',
            status: 'active',
          }).catch(() => null)
        }

        await emitPlatformEvent(admin, {
          eventType: 'wallet.debited',
          aggregateType: 'wallet',
          aggregateId: wallet.id,
          actorId: user.id,
          payload: { amount, type: 'withdrawal', transaction_id: txId, provider_ref: providerRef },
          idempotencyKey: `wallet-debit-${txId}`,
        })

        return jsonResponse({
          ok: true,
          transaction_id: txId,
          provider_ref: providerRef,
          status: transferStatus,
          demo: !providerRef && provider === 'paystack',
          message: providerRef ? 'Transfer initiated via Paystack' : 'Withdrawal queued',
        })
      }

      if (body.action === 'save_payout_account') {
        const row = {
          id: body.id ?? `pa-${crypto.randomUUID().slice(0, 8)}`,
          user_id: user.id,
          provider: body.provider ?? 'paystack',
          account_ref: body.account_number ?? body.account_ref,
          account_name: body.account_name ?? user.email?.split('@')[0] ?? 'Account holder',
          account_type: body.account_type ?? 'mobile_money',
          bank_code: body.bank_code ?? 'MTN',
          verified: body.verified ?? false,
        }
        if (!row.account_ref) return errorResponse('account_number required', 400)
        await admin.from('payout_accounts').upsert(row)
        return jsonResponse({ ok: true, account: row })
      }

      if (body.action === 'hold_escrow') {
        const amount = Number(body.amount)
        if (!amount || amount <= 0) return errorResponse('Invalid amount', 400)
        if (Number(wallet.available_balance) < amount) return errorResponse('Insufficient balance', 400)

        const holdId = `wh-${crypto.randomUUID().slice(0, 8)}`
        await admin.from('wallet_holds').insert({
          id: holdId,
          wallet_id: wallet.id,
          amount,
          reason: body.reason ?? 'escrow_hold',
          status: 'active',
          escrow_id: body.reference_id ?? body.escrow_id ?? null,
        })
        await admin.from('wallets').update({
          available_balance: Number(wallet.available_balance) - amount,
          pending_balance: Number(wallet.pending_balance) + amount,
        }).eq('id', wallet.id)
        return jsonResponse({ ok: true, hold_id: holdId })
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
