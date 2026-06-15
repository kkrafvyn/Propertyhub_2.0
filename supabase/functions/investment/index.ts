import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: portfolios } = await admin.from('investment_portfolios').select('*').eq('user_id', user.id).limit(1)
        const portfolio = portfolios?.[0]
        let holdings: unknown[] = []
        if (portfolio) {
          const { data } = await admin.from('portfolio_holdings').select('*').eq('portfolio_id', portfolio.id)
          holdings = data ?? []
        }
        const totalValue = holdings.reduce((s: number, h: { cost_basis?: number }) => s + Number(h.cost_basis ?? 0), 0)
        return jsonResponse({
          portfolio: portfolio ? { name: portfolio.name, holdings: holdings.length, totalValue } : null,
          holdings,
          source: 'supabase',
        })
      }

      if (action === 'scenarios') {
        const { data } = await admin.from('investment_scenarios').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ scenarios: data ?? [], source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'scenario') {
        const price = Number(body.assumptions?.price ?? 500000)
        const rent = Number(body.assumptions?.monthlyRent ?? 3500)
        const capRate = ((rent * 12) / price) * 100
        const projections = {
          capRate: capRate.toFixed(2),
          annualCashFlow: rent * 12,
          fiveYearAppreciation: Math.round(price * 1.28),
        }
        const row = {
          id: `is-${crypto.randomUUID().slice(0, 8)}`,
          user_id: user.id,
          listing_id: body.listing_id,
          assumptions: body.assumptions ?? {},
          projections,
        }
        await admin.from('investment_scenarios').insert(row)
        return jsonResponse({ ok: true, projections, source: 'supabase' })
      }

      if (body.action === 'add_holding') {
        const row = {
          id: `ph-${crypto.randomUUID().slice(0, 8)}`,
          portfolio_id: body.portfolio_id,
          listing_id: body.listing_id,
          asset_ref: body.asset_ref,
          cost_basis: body.cost_basis,
          acquired_at: new Date().toISOString().slice(0, 10),
        }
        const { error } = await admin.from('portfolio_holdings').insert(row)
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ ok: true, holding: row })
      }

      if (body.action === 'ensure_portfolio') {
        const id = body.portfolio_id ?? `ip-${user.id.slice(0, 8)}`
        await admin.from('investment_portfolios').upsert({
          id,
          user_id: user.id,
          name: body.name ?? 'My Portfolio',
          currency: 'GHS',
        })
        return jsonResponse({ ok: true, portfolio_id: id })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
