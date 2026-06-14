import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { createInsuranceQuoteInDb } from '../lib/supabase-db'

export async function requestInsuranceQuote({ productId, propertyValue, coverageType }) {
  try {
    const payload = await callEdgeFunction('insurance', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'quote', product_id: productId, property_value: propertyValue, coverage_type: coverageType },
    })
    if (payload?.quote) return { ok: true, quote: payload.quote, partner: payload.partner, live: payload.live, source: 'supabase' }
  } catch { /* fallback */ }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const premium = Math.round(Number(propertyValue || 500000) * 0.0025)
      const row = await createInsuranceQuoteInDb({
        userId: user.id,
        productId,
        propertyValue: Number(propertyValue),
        coverageType,
        premiumEstimate: premium,
      })
      if (row) return { ok: true, quote: row, source: 'supabase' }
    }
  }

  try {
    return await callEdgeFunction('payments', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'insurance_quote', product_id: productId, property_value: propertyValue, coverage_type: coverageType },
    })
  } catch {
    return {
      ok: true,
      quote: { premium_estimate: Math.round(Number(propertyValue || 500000) * 0.0025), status: 'pending' },
      source: 'local',
    }
  }
}

export default { requestInsuranceQuote }
