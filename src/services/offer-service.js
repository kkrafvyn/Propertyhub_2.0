import { callEdgeFunction } from '../lib/edge-client'
import { offerHistory } from '../data/buyer'

const STORAGE_KEY = 'baytmiftah_offers'

export function getLocalOffers() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return [...stored, ...offerHistory]
  } catch {
    return offerHistory
  }
}

export async function fetchOffers() {
  try {
    const payload = await callEdgeFunction('persistence', {
      allowAnonymous: false,
      query: { action: 'offers' },
    })
    if (payload?.offers?.length) return { offers: payload.offers, source: 'supabase' }
  } catch { /* fallback */ }
  return { offers: getLocalOffers(), source: 'local' }
}

export async function submitOffer({ property, amount, notes }) {
  const offer = {
    id: `offer-${Date.now()}`,
    property,
    amount: Number(amount),
    status: 'pending',
    notes,
    updated: new Date().toISOString().slice(0, 10),
  }

  try {
    const payload = await callEdgeFunction('persistence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'create_offer', offer },
    })
    return payload
  } catch {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    localStorage.setItem(STORAGE_KEY, JSON.stringify([offer, ...stored]))
    return { ok: true, offer, source: 'local' }
  }
}

export default { fetchOffers, submitOffer }
