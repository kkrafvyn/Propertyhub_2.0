import { callEdgeFunction } from '../lib/edge-client'
import { aiAdvisorResponses } from '../data/buyer'
import { marketSummary, priceTrends, heatmapZones, valuationSamples } from '../data/intelligence'

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

export async function runValuation({ address, bedrooms, sqft, propertyType = 'house' }) {
  try {
    const payload = await callEdgeFunction('intelligence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'valuation', address, bedrooms, sqft, property_type: propertyType },
    })
    if (payload?.estimated) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }

  const base = (sqft || 2000) * 850 + (bedrooms || 3) * 120000
  return {
    estimated: base,
    range: `${Math.round(base * 0.94 / 1000000 * 10) / 10}M – ${Math.round(base * 1.06 / 1000000 * 10) / 10}M`,
    confidence: 85,
    currency: 'GHS',
    method: 'AI comparables (local)',
    source: 'local',
  }
}

export async function fetchValuationHistory() {
  return { valuations: valuationSamples, source: 'local' }
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
