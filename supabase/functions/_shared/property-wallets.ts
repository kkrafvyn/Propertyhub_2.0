/** Property-level wallets and rent/utility payout splits */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recordLedgerEntry } from './ledger.ts'

export async function ensurePropertyWallet(
  admin: SupabaseClient,
  propertyId: string,
  currency = 'GHS',
  purpose: 'rent' | 'utility' | 'general' = 'rent',
) {
  const id = `pw-${purpose.slice(0, 4)}-${propertyId.slice(0, 12)}`
  const { data } = await admin
    .from('wallets')
    .select('*')
    .eq('owner_type', 'property')
    .eq('owner_id', propertyId)
    .eq('wallet_purpose', purpose)
    .eq('currency', currency)
    .maybeSingle()

  if (data) return data

  const row = {
    id,
    owner_type: 'property',
    owner_id: propertyId,
    currency,
    wallet_purpose: purpose,
    available_balance: 0,
    pending_balance: 0,
  }
  await admin.from('wallets').upsert(row, { onConflict: 'id' })
  return row
}

export async function splitPaymentToProperty(
  admin: SupabaseClient,
  params: {
    propertyId: string
    amount: number
    currency?: string
    paymentId: string
    purpose: string
    landlordUserId?: string
  },
) {
  const { propertyId, amount, paymentId, purpose } = params
  if (!propertyId || amount <= 0) return

  const currency = params.currency ?? 'GHS'
  const walletPurpose = purpose === 'utility' ? 'utility' : 'rent'

  const { data: rule } = await admin
    .from('property_payout_rules')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()

  const platformPct = Number(rule?.platform_fee_pct ?? 5)
  const landlordPct = Number(rule?.landlord_split_pct ?? 95)
  const landlordUserId = rule?.owner_user_id ?? params.landlordUserId

  const platformFee = Math.round(amount * (platformPct / 100) * 100) / 100
  const landlordShare = Math.round(amount * (landlordPct / 100) * 100) / 100

  const propertyWallet = await ensurePropertyWallet(admin, propertyId, currency, walletPurpose)

  await admin.from('wallets').update({
    available_balance: Number(propertyWallet.available_balance) + landlordShare,
    updated_at: new Date().toISOString(),
  }).eq('id', propertyWallet.id)

  await recordLedgerEntry(admin, {
    entryType: 'credit',
    accountType: 'property_wallet',
    accountId: propertyId,
    amount: landlordShare,
    currency,
    referenceType: 'payment',
    referenceId: paymentId,
    idempotencyKey: `prop-split-${paymentId}`,
    description: `${purpose} payout to property wallet`,
  })

  if (platformFee > 0) {
    await recordLedgerEntry(admin, {
      entryType: 'credit',
      accountType: 'platform',
      accountId: 'fees',
      amount: platformFee,
      currency,
      referenceType: 'payment',
      referenceId: paymentId,
      idempotencyKey: `platform-fee-${paymentId}`,
      description: `Platform fee (${platformPct}%)`,
    })
  }

  if (landlordUserId && rule?.auto_payout !== false) {
    const landlordWalletId = `wal-rent-${landlordUserId.slice(0, 8)}`
    const { data: lw } = await admin.from('wallets').select('*').eq('id', landlordWalletId).maybeSingle()
    if (lw) {
      await admin.from('wallets').update({
        available_balance: Number(lw.available_balance) + landlordShare,
        updated_at: new Date().toISOString(),
      }).eq('id', landlordWalletId)
    }
  }

  return { propertyWalletId: propertyWallet.id, landlordShare, platformFee }
}
