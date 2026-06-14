import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

const PARTNERS: Record<string, { name: string; rate: number }> = {
  'ins-home-shield': { name: 'HomeShield Ghana', rate: 0.0028 },
  'ins-landlord-plus': { name: 'Landlord Plus', rate: 0.0032 },
  'ins-commercial': { name: 'Commercial Cover GH', rate: 0.0045 },
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()

  try {
    if (req.method === 'GET') {
      const { data } = await admin.from('insurance_products').select('*')
      return jsonResponse({ products: data ?? [], source: 'supabase' })
    }

    if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

    const body = await req.json()
    if (body.action !== 'quote') return errorResponse('Unsupported action', 404)

    const productId = body.product_id as string
    const propertyValue = Number(body.property_value) || 500000
    const coverageType = body.coverage_type ?? 'building'
    const partner = PARTNERS[productId] ?? { name: 'BaytMiftah Partner', rate: 0.0025 }
    const apiKey = Deno.env.get('INSURANCE_PARTNER_API_KEY')
    const apiUrl = Deno.env.get('INSURANCE_PARTNER_API_URL')

    let premium = Math.round(propertyValue * partner.rate)
    let partnerResponse: Record<string, unknown> = {
      partner: partner.name,
      method: 'internal_rate_card',
      coverage_type: coverageType,
    }

    if (apiKey && apiUrl) {
      try {
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/quotes`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: productId,
            property_value: propertyValue,
            coverage_type: coverageType,
            country: 'GH',
          }),
        })
        const payload = await res.json()
        if (res.ok && payload?.premium) {
          premium = Math.round(Number(payload.premium))
          partnerResponse = { ...partnerResponse, method: 'live_api', raw: payload }
        }
      } catch (e) {
        partnerResponse = { ...partnerResponse, api_error: e instanceof Error ? e.message : 'partner unavailable' }
      }
    }

    const { data, error } = await admin.from('insurance_quotes').insert({
      user_id: user.id,
      product_id: productId,
      property_value: propertyValue,
      coverage_type: coverageType,
      premium_estimate: premium,
      status: 'quoted',
      partner_response: partnerResponse,
    }).select('*').single()

    if (error) throw error

    return jsonResponse({
      ok: true,
      quote: data,
      partner: partner.name,
      live: Boolean(apiKey && apiUrl),
      source: 'supabase',
    })
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
