import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureEnterpriseData } from '../_shared/user-seed.ts'

function mapPortfolio(p: Record<string, unknown>) {
  const aum = Number(p.aum ?? 0)
  return {
    id: p.id,
    name: p.name,
    country: p.country,
    assets: p.assets ?? 0,
    aum,
    value: aum >= 1e9 ? `GHS ${(aum / 1e9).toFixed(1)}B` : `GHS ${aum.toLocaleString()}`,
    yield: p.yield_pct != null ? `${p.yield_pct}%` : '—',
    risk: p.risk_band ?? 'medium',
    occupancy: p.occupancy_pct != null ? `${p.occupancy_pct}%` : null,
    organization_id: p.organization_id ?? null,
  }
}

function mapForecast(r: Record<string, unknown>) {
  return {
    year: r.year,
    quarter: `Q4 ${r.year}`,
    revenue: r.revenue,
    expenses: r.revenue && r.noi ? Number(r.revenue) - Number(r.noi) : null,
    noi: r.noi,
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureEnterpriseData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (req.method === 'POST') {
    const body = await req.json()

    if (body.action === 'create_portfolio') {
      const id = `ep-${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        org_id: user.id,
        name: body.name,
        country: body.country ?? 'GH',
        assets: Number(body.assets ?? 0),
        aum: Number(body.aum ?? 0),
        organization_id: body.organization_id ?? null,
        yield_pct: body.yield_pct ?? null,
        risk_band: body.risk_band ?? 'medium',
        occupancy_pct: body.occupancy_pct ?? null,
      }
      if (!row.name) return errorResponse('name required', 400)
      await admin.from('enterprise_portfolios').insert(row)
      return jsonResponse({ ok: true, portfolio: mapPortfolio(row) })
    }

    if (body.action === 'link_org_portfolio') {
      const id = `eol-${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        org_id: body.org_id,
        portfolio_id: body.portfolio_id,
        owner_user_id: user.id,
      }
      if (!row.org_id || !row.portfolio_id) return errorResponse('org_id and portfolio_id required', 400)

      const { data: member } = await admin
        .from('organization_members')
        .select('role')
        .eq('org_id', body.org_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!member && body.org_id !== user.id) {
        return errorResponse('Not a member of this organization', 403)
      }

      await admin.from('enterprise_org_links').upsert(row, { onConflict: 'org_id,portfolio_id' })
      await admin.from('enterprise_portfolios').update({ organization_id: body.org_id }).eq('id', body.portfolio_id)
      return jsonResponse({ ok: true, link: row })
    }

    if (body.action === 'unlink_org_portfolio') {
      await admin.from('enterprise_org_links').delete().eq('org_id', body.org_id).eq('portfolio_id', body.portfolio_id)
      await admin.from('enterprise_portfolios').update({ organization_id: null }).eq('id', body.portfolio_id)
      return jsonResponse({ ok: true })
    }

    return errorResponse('Unsupported action', 404)
  }

  if (action === 'dashboard') {
    const { data: portfolios } = await admin.from('enterprise_portfolios').select('*').eq('org_id', user.id)
    const aum = portfolios?.reduce((s, p) => s + Number(p.aum ?? 0), 0) ?? 0
    const avgOccupancy = portfolios?.length
      ? portfolios.reduce((s, p) => s + Number(p.occupancy_pct ?? 91), 0) / portfolios.length
      : 91

    return jsonResponse({
      org: {
        name: 'Miftah Capital REIT',
        countries: new Set(portfolios?.map((p) => p.country)).size,
        assets: portfolios?.reduce((s, p) => s + (p.assets ?? 0), 0) ?? 0,
        aum: aum >= 1e9 ? `GHS ${(aum / 1e9).toFixed(1)}B` : `GHS ${aum.toLocaleString()}`,
        occupancy: `${Math.round(avgOccupancy)}%`,
      },
      source: 'supabase',
    })
  }

  if (action === 'portfolios') {
    const { data } = await admin.from('enterprise_portfolios').select('*').eq('org_id', user.id)
    return jsonResponse({ portfolios: (data ?? []).map(mapPortfolio), source: 'supabase' })
  }

  if (action === 'esg') {
    const { data } = await admin.from('enterprise_esg').select('*').eq('org_id', user.id)
    const score = data?.find((r) => r.metric.includes('ESG'))?.value ?? '78'
    const gov = data?.find((r) => r.metric.includes('Governance'))?.value ?? 'A-'
    const metrics = (data ?? []).map((r) => ({ label: r.metric, value: r.value }))
    return jsonResponse({
      esg: {
        score: Number(score) || 78,
        governanceRating: gov,
        carbonIntensity: data?.find((r) => r.metric.toLowerCase().includes('carbon'))?.value ?? '—',
        renewableShare: data?.find((r) => r.metric.toLowerCase().includes('renewable'))?.value ?? '—',
        metrics,
      },
      source: 'supabase',
    })
  }

  if (action === 'forecast') {
    const { data } = await admin.from('enterprise_forecasts').select('*').eq('org_id', user.id).order('year')
    return jsonResponse({ forecast: (data ?? []).map(mapForecast), source: 'supabase' })
  }

  if (action === 'org_links') {
    const { data } = await admin.from('enterprise_org_links').select('*').eq('owner_user_id', user.id)
    return jsonResponse({ links: data ?? [], source: 'supabase' })
  }

  return errorResponse('Unsupported action', 404)
})
