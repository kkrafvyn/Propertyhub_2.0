import { callEdgeFunction } from '../lib/edge-client'
import { aiAdvisorResponses } from '../data/buyer'
import { marketSummary, priceTrends, heatmapZones, valuationSamples } from '../data/intelligence'
import { fetchListings } from './marketplace-service'

export async function askBuyerAdvisor({ question, listingId, context = {} }) {
  try {
    const payload = await callEdgeFunction('intelligence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'buyer_advisor', question, listing_id: listingId, context },
    })
    if (payload?.answer) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }

  const q = question.toLowerCase()
  let answer = 'I can help analyze pricing, neighborhood growth, and rental yield for any listing on BaytMiftah.'
  if (q.includes('overprice') || q.includes('price')) answer = aiAdvisorResponses.overpriced
  if (q.includes('neighborhood') || q.includes('grow')) answer = aiAdvisorResponses.neighborhood
  if (q.includes('yield') || q.includes('rent')) answer = aiAdvisorResponses.yield

  return { answer, source: 'local' }
}

export async function runListingCoach(listing) {
  try {
    const payload = await callEdgeFunction('intelligence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'listing_coach', listing },
    })
    if (payload?.score) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }

  return {
    score: 87,
    tips: ['Strong photo coverage', 'Verified location', 'Add floor plan for +5 points', 'Include GhanaPost GPS for trust boost'],
    source: 'local',
  }
}

export async function fetchIntelligenceDashboard() {
  try {
    const payload = await callEdgeFunction('intelligence', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.summary) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return { summary: marketSummary, source: 'local' }
}

export async function fetchMarketData() {
  try {
    const payload = await callEdgeFunction('intelligence', {
      allowAnonymous: false,
      query: { action: 'market' },
    })
    if (payload?.trends) return { summary: payload.summary ?? marketSummary, trends: payload.trends, source: 'supabase' }
  } catch { /* fallback */ }
  return { summary: marketSummary, trends: priceTrends, source: 'local' }
}

export async function fetchHeatmap() {
  try {
    const payload = await callEdgeFunction('intelligence', {
      allowAnonymous: false,
      query: { action: 'heatmap' },
    })
    if (payload?.zones?.length) return { zones: payload.zones, source: 'supabase' }
  } catch { /* fallback */ }
  return { zones: heatmapZones, source: 'local' }
}

export async function runValuation({ address, bedrooms, sqft, propertyType = 'house', listingType = 'sale' }) {
  try {
    const payload = await callEdgeFunction('intelligence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'valuation', address, bedrooms, sqft, property_type: propertyType },
    })
    if (payload?.estimated) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }

  const { listings } = await fetchListings()
  const comps = listings
    .filter((l) => {
      const typeMatch = !propertyType || `${l.type}`.toLowerCase().includes(propertyType.toLowerCase())
      const bedsMatch = !bedrooms || (l.bedrooms && Math.abs(l.bedrooms - bedrooms) <= 1)
      const locMatch = !address || `${l.location}`.toLowerCase().includes(address.split(',')[0]?.toLowerCase() || '')
      return typeMatch && bedsMatch && locMatch && l.price > 0
    })
    .slice(0, 8)

  if (comps.length >= 2) {
    const avg = comps.reduce((s, c) => s + c.price, 0) / comps.length
    const sqftAdj = sqft && comps.some((c) => c.sqft) ? sqft / (comps.reduce((s, c) => s + (c.sqft || 1), 0) / comps.length) : 1
    const estimated = Math.round(avg * sqftAdj)
    return {
      estimated,
      range: `${Math.round(estimated * 0.92 / 1000000 * 10) / 10}M – ${Math.round(estimated * 1.08 / 1000000 * 10) / 10}M`,
      confidence: Math.min(92, 70 + comps.length * 3),
      currency: 'GHS',
      method: `Comparable sales (${comps.length} listings)`,
      comps: comps.map((c) => ({ id: c.id, title: c.title, price: c.price, location: c.location })),
      listingType,
      source: 'local',
    }
  }

  const base = (sqft || 2000) * 850 + (bedrooms || 3) * 120000
  return {
    estimated: base,
    range: `${Math.round(base * 0.94 / 1000000 * 10) / 10}M – ${Math.round(base * 1.06 / 1000000 * 10) / 10}M`,
    confidence: 85,
    currency: 'GHS',
    method: 'AI comparables (local)',
    comps: [],
    source: 'local',
  }
}

export async function fetchValuationHistory() {
  try {
    const payload = await callEdgeFunction('intelligence', {
      allowAnonymous: false,
      query: { action: 'valuation_history' },
    })
    if (payload?.valuations) return { valuations: payload.valuations, source: 'supabase' }
  } catch { /* fallback */ }
  return { valuations: valuationSamples, source: 'local' }
}

export async function fetchPropertyScore(listingId) {
  try {
    const payload = await callEdgeFunction('intelligence', {
      allowAnonymous: true,
      query: { action: 'property_score', listing_id: listingId },
    })
    if (payload?.propertyScore) return payload
  } catch { /* fallback */ }
  return { propertyScore: { score: 75 }, source: 'local' }
}

export default {
  askBuyerAdvisor,
  runListingCoach,
  fetchIntelligenceDashboard,
  fetchMarketData,
  fetchHeatmap,
  runValuation,
  fetchValuationHistory,
}
