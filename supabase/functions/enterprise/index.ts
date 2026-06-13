import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureEnterpriseData } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureEnterpriseData(admin, user.id)

  const action = new URL(req.url).searchParams.get('action')

  if (action === 'dashboard') {
    const { data: portfolios } = await admin.from('enterprise_portfolios').select('*').eq('org_id', user.id)
    const aum = portfolios?.reduce((s, p) => s + Number(p.aum ?? 0), 0) ?? 0
    return jsonResponse({
      org: {
        name: 'Miftah Capital REIT', countries: portfolios?.length ?? 0,
        assets: portfolios?.reduce((s, p) => s + (p.assets ?? 0), 0) ?? 0,
        aum: `GHS ${(aum / 1e9).toFixed(1)}B`, occupancy: '91%',
      },
      source: 'supabase',
    })
  }

  if (action === 'portfolios') {
    const { data } = await admin.from('enterprise_portfolios').select('*').eq('org_id', user.id)
    return jsonResponse({ portfolios: data ?? [], source: 'supabase' })
  }

  if (action === 'esg') {
    const { data } = await admin.from('enterprise_esg').select('*').eq('org_id', user.id)
    const score = data?.find((r) => r.metric.includes('ESG'))?.value ?? '78'
    const gov = data?.find((r) => r.metric.includes('Governance'))?.value ?? 'A-'
    return jsonResponse({ esg: { score: Number(score) || 78, governanceRating: gov, metrics: data ?? [] }, source: 'supabase' })
  }

  if (action === 'forecast') {
    const { data } = await admin.from('enterprise_forecasts').select('*').eq('org_id', user.id).order('year')
    const forecast = (data ?? []).map((r) => ({ year: r.year, revenue: r.revenue, noi: r.noi }))
    return jsonResponse({ forecast, source: 'supabase' })
  }

  return errorResponse('Unsupported action', 404)
})
