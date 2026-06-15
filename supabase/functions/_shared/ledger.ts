/** ACID financial ledger — append-only, idempotent entries */

import type { createAdminClient } from './supabase.ts'
import { emitPlatformEvent } from './events.ts'

export type LedgerAccountType = 'user_wallet' | 'property_wallet' | 'escrow' | 'platform' | 'utility' | 'rent'
export type LedgerEntryType = 'debit' | 'credit'

export interface LedgerEntryInput {
  entryType: LedgerEntryType
  accountType: LedgerAccountType
  accountId: string
  amount: number
  currency?: string
  referenceType: string
  referenceId: string
  idempotencyKey: string
  description?: string
  metadata?: Record<string, unknown>
  actorId?: string
}

export async function recordLedgerEntry(
  admin: ReturnType<typeof createAdminClient>,
  input: LedgerEntryInput,
): Promise<{ id: string } | null> {
  if (input.amount <= 0) return null

  const id = `led-${crypto.randomUUID().slice(0, 12)}`
  const row = {
    id,
    entry_type: input.entryType,
    account_type: input.accountType,
    account_id: input.accountId,
    amount: input.amount,
    currency: input.currency ?? 'GHS',
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    idempotency_key: input.idempotencyKey,
    description: input.description,
    metadata: input.metadata ?? {},
  }

  const { error } = await admin.from('financial_ledger').insert(row)
  if (error) {
    if (error.message.includes('idempotency')) return { id: input.idempotencyKey }
    console.error('recordLedgerEntry failed', error.message)
    return null
  }

  await emitPlatformEvent(admin, {
    eventType: 'ledger.entry_recorded',
    aggregateType: 'ledger',
    aggregateId: id,
    actorId: input.actorId,
    payload: {
      entry_type: input.entryType,
      account_type: input.accountType,
      amount: input.amount,
      reference_type: input.referenceType,
      reference_id: input.referenceId,
    },
    idempotencyKey: `evt-${input.idempotencyKey}`,
  })

  return { id }
}

/** Record balanced payment: credit user wallet + debit platform clearing (simplified double-entry) */
export async function recordPaymentLedger(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    userId: string
    amount: number
    currency?: string
    paymentId: string
    purpose: string
    actorId?: string
  },
) {
  const key = `pay-${params.paymentId}`
  await recordLedgerEntry(admin, {
    entryType: 'credit',
    accountType: params.purpose === 'utility' ? 'utility' : params.purpose.includes('rent') ? 'rent' : 'user_wallet',
    accountId: params.userId,
    amount: params.amount,
    currency: params.currency,
    referenceType: 'payment',
    referenceId: params.paymentId,
    idempotencyKey: `${key}-credit`,
    description: `${params.purpose} payment received`,
    actorId: params.actorId ?? params.userId,
  })
  await recordLedgerEntry(admin, {
    entryType: 'debit',
    accountType: 'platform',
    accountId: 'clearing',
    amount: params.amount,
    currency: params.currency,
    referenceType: 'payment',
    referenceId: params.paymentId,
    idempotencyKey: `${key}-debit`,
    description: `${params.purpose} clearing`,
    actorId: params.actorId ?? params.userId,
  })
}
