/** Paystack Transfer API — mobile money / bank payouts */

const PAYSTACK_BASE = 'https://api.paystack.co'

function secretKey() {
  return Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
}

export async function ensurePaystackRecipient(input: {
  name: string
  accountNumber: string
  accountType?: string
  bankCode?: string
  currency?: string
  existingRecipientCode?: string | null
}) {
  const secret = secretKey()
  if (!secret) return { ok: false as const, error: 'PAYSTACK_SECRET_KEY not configured' }
  if (input.existingRecipientCode) {
    return { ok: true as const, recipient_code: input.existingRecipientCode, created: false }
  }

  const type = input.accountType === 'bank' ? 'nuban' : 'mobile_money'
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode ?? (type === 'mobile_money' ? 'MTN' : '058'),
      currency: input.currency ?? 'GHS',
    }),
  })

  const data = await res.json()
  if (!data.status || !data.data?.recipient_code) {
    return { ok: false as const, error: data.message ?? 'Failed to create transfer recipient' }
  }

  return { ok: true as const, recipient_code: data.data.recipient_code as string, created: true }
}

export async function initiatePaystackTransfer(input: {
  amount: number
  recipientCode: string
  reason?: string
  reference?: string
  currency?: string
}) {
  const secret = secretKey()
  if (!secret) return { ok: false as const, error: 'PAYSTACK_SECRET_KEY not configured' }

  const minor = Math.round(input.amount * 100)
  if (minor < 100) return { ok: false as const, error: 'Minimum transfer amount is GHS 1' }

  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'balance',
      amount: minor,
      recipient: input.recipientCode,
      reason: input.reason ?? 'BaytMiftah wallet withdrawal',
      reference: input.reference ?? `wd-${crypto.randomUUID().slice(0, 12)}`,
      currency: input.currency ?? 'GHS',
    }),
  })

  const data = await res.json()
  if (!data.status) {
    return { ok: false as const, error: data.message ?? 'Transfer failed', raw: data }
  }

  return {
    ok: true as const,
    transfer_code: data.data?.transfer_code as string,
    reference: data.data?.reference as string,
    status: data.data?.status as string,
  }
}
