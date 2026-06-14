import { callEdgeFunction } from '../lib/edge-client'
import { getDefaultProvider } from '../lib/payment-providers'
import { getPaymentsMode } from '../lib/payments-config'

const PAYMENTS_KEY = 'baytmiftah_payments'

function saveLocalPayment(record) {
  try {
    const stored = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]')
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([record, ...stored]))
  } catch { /* ignore */ }
}

/**
 * Initiate checkout via Stripe or Paystack Edge Function.
 * Redirects to checkout_url when provider keys are configured.
 */
export async function initiateCheckout({
  purpose,
  amount,
  currency = 'GHS',
  provider = getDefaultProvider(currency),
  metadata = {},
  successPath = '/payments/success',
  cancelPath = '/payments/cancel',
}) {
  try {
    const payload = await callEdgeFunction('payments', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'create_checkout',
        purpose,
        amount,
        currency,
        provider,
        metadata,
        success_path: successPath,
        cancel_path: cancelPath,
      },
    })

    if (payload?.checkout_url) {
      window.location.href = payload.checkout_url
      return payload
    }

    return payload
  } catch (err) {
    const record = {
      id: `local-${Date.now()}`,
      purpose,
      amount,
      currency,
      provider,
      status: 'demo',
      created_at: new Date().toISOString(),
    }
    saveLocalPayment(record)
    return {
      ok: true,
      source: 'local',
      checkout_url: null,
      message: err.message || 'Configure STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY on Supabase Edge Functions, then redeploy.',
      mode: getPaymentsMode(),
      payment: record,
    }
  }
}

export async function createFeaturedBoost({ listingId, provider = 'paystack', amount = 299, plan = 'featured_14d' }) {
  return initiateCheckout({
    purpose: 'featured_boost',
    amount,
    provider,
    metadata: { listing_id: listingId, plan },
    successPath: '/payments/success?purpose=featured_boost',
    cancelPath: '/payments/cancel',
  })
}

export async function payRent({ paymentId, amount, provider = 'paystack', metadata = {} }) {
  return initiateCheckout({
    purpose: 'rent_payment',
    amount,
    provider,
    metadata: { rent_payment_id: paymentId, ...metadata },
    successPath: '/payments/success?purpose=rent',
    cancelPath: '/payments/cancel',
  })
}

export async function fundEscrow({ escrowId, amount, provider = 'paystack' }) {
  return initiateCheckout({
    purpose: 'escrow_deposit',
    amount,
    provider,
    metadata: { escrow_id: escrowId },
    successPath: '/finance/escrow?funded=1',
    cancelPath: '/finance/escrow',
  })
}

export async function settleCommission({ settlementId, amount, provider = 'paystack' }) {
  return initiateCheckout({
    purpose: 'commission_settlement',
    amount,
    provider,
    metadata: { settlement_id: settlementId },
    successPath: '/finance/commissions?settled=1',
    cancelPath: '/finance/commissions',
  })
}

export async function fetchPaymentHistory() {
  try {
    const payload = await callEdgeFunction('payments', {
      allowAnonymous: false,
      query: { action: 'history' },
    })
    if (payload?.payments) return payload
  } catch { /* fallback */ }

  try {
    const local = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]')
    return { payments: local, source: 'local' }
  } catch {
    return { payments: [], source: 'local' }
  }
}

export default {
  initiateCheckout,
  createFeaturedBoost,
  payRent,
  fundEscrow,
  settleCommission,
  fetchPaymentHistory,
}
