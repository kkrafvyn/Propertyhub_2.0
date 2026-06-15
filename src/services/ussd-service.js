import { callEdgeFunction } from '../lib/edge-client'

export function generateUssdCode(paymentId, provider = 'mtn') {
  const ref = paymentId.replace(/\W/g, '').slice(-8).toUpperCase()
  if (provider === 'telecel') return `*110*000*${ref}#`
  return `*170*33*${ref}#`
}

export async function initiateUssdPayment({ paymentId, amount, phone, provider = 'mtn' }) {
  const ussd = generateUssdCode(paymentId, provider)
  try {
    const result = await callEdgeFunction('payments', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'ussd_initiate',
        payment_id: paymentId,
        amount,
        phone,
        ussd_code: ussd,
        momo_provider: provider,
        channel: provider === 'telecel' ? 'telecel_momo' : 'mtn_momo',
      },
    })
    return { ...result, ussd, provider, source: 'supabase' }
  } catch {
    return {
      ok: true,
      ussd,
      provider,
      message: provider === 'telecel'
        ? 'Dial the Telecel Cash code on your phone to complete payment.'
        : 'Dial the MTN MoMo code on your phone. Paystack confirms when configured.',
      source: 'local',
    }
  }
}

export default { generateUssdCode, initiateUssdPayment }
