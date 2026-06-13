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

  if (action === 'dashboard') {
    const { data: branches } = await admin.from('agency_branches').select('*')
    const { data: leads } = await admin.from('agent_leads').select('*').limit(10)
    const teamCount = branches?.reduce((s, b) => s + (b.agents ?? 0), 0) ?? 0
    return jsonResponse({
      agency: { name: 'Gold Coast Realty', trustScore: 94, teamCount, activeListings: 24, leadsThisMonth: leads?.length ?? 0 },
      leads: leads ?? [], listings: [],
      source: 'supabase',
    })
  }

  if (action === 'team') {
    const { data } = await admin.from('agency_team').select('*')
    return jsonResponse({ team: data ?? [], source: 'supabase' })
  }

  if (action === 'branches') {
    const { data } = await admin.from('agency_branches').select('*')
    return jsonResponse({ branches: data ?? [], source: 'supabase' })
  }

  if (action === 'payroll') {
    const { data } = await admin.from('agency_payroll').select('*')
    return jsonResponse({ payroll: data ?? [], source: 'supabase' })
  }

  if (action === 'analytics') {
    const { data: trends } = await admin.from('market_trends').select('*').limit(4)
    return jsonResponse({
      analytics: {
        revenueMtd: 284000, revenueYtd: 1840000, closedDeals: 7, avgCommission: 6200,
        leadConversion: '18%', revenueByMonth: trends ?? [], topAgents: [],
      },
      source: 'supabase',
    })
  }

  if (action === 'trust') {
    return jsonResponse({
      trust: {
        score: 94, trend: '+2',
        factors: [
          { label: 'Verified listings', score: 98, weight: '30%' },
          { label: 'Response time', score: 92, weight: '20%' },
        ],
        badges: ['Verified agency'], lastReview: '2026-06-01',
      },
      source: 'supabase',
    })
  }

  if (action === 'compliance') {
    const { data } = await admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(10)
    return jsonResponse({ compliance: data ?? [], source: 'supabase' })
  }

  return errorResponse('Unsupported action', 404)
})
