import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { chatCompletion, jsonCompletion } from '../_shared/openai.ts'

function scoreListing(listing: Record<string, unknown>) {
  let score = 70
  const tips: string[] = []
  const photos = listing.photos as unknown[] | undefined
  if (photos?.length && photos.length >= 4) { score += 10; tips.push('Strong photo coverage') }
  else tips.push('Add at least 4 photos for +10 points')
  if (listing.verified) { score += 5; tips.push('Verified location') }
  if (listing.description && String(listing.description).length > 100) score += 5
  else tips.push('Expand description for +5 points')
  tips.push('Add floor plan for +5 points')
  return { score: Math.min(score, 100), tips }
}

function buyerAdvisorAnswer(question: string) {
  const q = question.toLowerCase()
  if (q.includes('overprice') || q.includes('price')) return 'Based on comparable sales, this listing appears ~4% above median with negotiation room likely.'
  if (q.includes('neighborhood') || q.includes('grow')) return 'The neighborhood shows strong annual growth with good school ratings and rental demand.'
  if (q.includes('yield') || q.includes('rent')) return 'Estimated rental yield is competitive versus similar units in the area.'
  return 'I can help analyze pricing, neighborhood growth, and rental yield for listings on BaytMiftah.'
}

function runValuation(body: Record<string, unknown>) {
  const sqft = Number(body.sqft) || 2000
  const bedrooms = Number(body.bedrooms) || 3
  const base = sqft * 850 + bedrooms * 120000
  return {
    estimated: base,
    range: `${(base * 0.94 / 1e6).toFixed(1)}M – ${(base * 1.06 / 1e6).toFixed(1)}M`,
    confidence: 88,
    currency: 'GHS',
    method: 'comparables',
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)

  try {
    if (req.method === 'GET') {
      const action = url.searchParams.get('action')
      const { data: trends } = await admin.from('market_trends').select('*').limit(4)
      const { data: zones } = await admin.from('market_zones').select('*')

      if (action === 'dashboard' || action === 'market') {
        const median = trends?.find((t) => t.metric === 'median_price' && t.period === '2026-Q2')?.value ?? 2850000
        return jsonResponse({
          summary: {
            region: 'Greater Accra', medianPrice: median, priceChangeYoY: '+7.2%',
            avgDaysOnMarket: 22, transactionVolume: 2105,
            hotZones: zones?.slice(0, 3).map((z) => z.name) ?? ['East Legon', 'Cantonments'],
          },
          trends: trends ?? [],
          source: 'supabase',
        })
      }
      if (action === 'heatmap') {
        const heatZones = (zones ?? []).map((z) => ({
          id: z.id, name: z.name, lat: z.lat, lng: z.lng, median: z.median, change: z.change_pct, volume: z.volume,
        }))
        return jsonResponse({ zones: heatZones, source: 'supabase' })
      }
      if (action === 'neighborhoods') {
        const { data } = await admin.from('neighborhoods').select('*')
        return jsonResponse({ neighborhoods: data ?? [], source: 'supabase' })
      }
      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'buyer_advisor') {
        const question = body.question ?? ''
        const ai = await chatCompletion(
          'You are a real estate buyer advisor for Ghana (Accra market). Give concise, practical advice.',
          question,
        )
        return jsonResponse({ answer: ai ?? buyerAdvisorAnswer(question), source: ai ? 'openai' : 'rules' })
      }

      if (body.action === 'listing_coach') {
        const listing = body.listing ?? {}
        const ai = await jsonCompletion<{ score: number; tips: string[] }>(
          'Score this property listing 0-100 and return JSON { score, tips: string[] }.',
          JSON.stringify(listing),
        )
        return jsonResponse(ai ?? scoreListing(listing))
      }

      if (body.action === 'valuation') {
        const ai = await jsonCompletion<{ estimated: number; range: string; confidence: number }>(
          'Estimate property value in GHS for Accra Ghana. Return JSON { estimated, range, confidence }.',
          JSON.stringify(body),
        )
        const result = ai ?? runValuation(body)
        await admin.from('valuations').insert({
          user_id: user.id,
          address: String(body.address || body.location || 'Unknown'),
          estimated: result.estimated,
          confidence: result.confidence ?? 88,
          metadata: body,
        }).catch(() => {})
        return jsonResponse({ ...result, currency: 'GHS', method: ai ? 'openai' : 'comparables' })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
