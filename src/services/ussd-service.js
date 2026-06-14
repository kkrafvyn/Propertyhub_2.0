import { callEdgeFunction } from '../lib/edge-client'

export function generateUssdCode(paymentId) {
  const ref = paymentId.replace(/\W/g, '').slice(-8).toUpperCase()
  return `*713*33*${ref}#`
}

export async function initiateUssdPayment({ paymentId, amount, phone }) {
  const ussd = generateUssdCode(paymentId)
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
      },
    })
    return { ...result, ussd, source: 'supabase' }
  } catch {
    return {
      ok: true,
      ussd,
      message: 'Dial the USSD code on your phone to pay via mobile money.',
      source: 'local',
    }
  }
}

export default { generateUssdCode, initiateUssdPayment }
