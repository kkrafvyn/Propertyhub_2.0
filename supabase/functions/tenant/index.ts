import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { computeTenantIntelligence, getTenantIntelligence } from '../_shared/tenant-intelligence.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    const user = await getUserFromRequest(req)
    if (!user) return errorResponse('Authentication required', 401)

    if (req.method === 'GET') {
      const targetUserId = url.searchParams.get('user_id') ?? user.id
      if (targetUserId !== user.id) {
        const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
        const staff = ['platform_admin', 'platform_moderator', 'property_manager', 'property_owner'].includes(profile?.role ?? '')
        if (!staff) return errorResponse('Forbidden', 403)
      }

      if (action === 'score' || action === 'profile') {
        const recompute = url.searchParams.get('recompute') === '1'
        const intel = await getTenantIntelligence(admin, targetUserId, recompute)
        return jsonResponse({
          profile: intel,
          recommendation: recommendationForBand(intel.risk_band),
          deposit_required_months: intel.deposit_multiplier,
          source: 'supabase',
        })
      }

      if (action === 'dashboard') {
        const intel = await getTenantIntelligence(admin, user.id)
        const { data: bills } = await admin.from('utility_bills').select('status, amount')
          .in('utility_account_id',
            (await admin.from('utility_accounts').select('id').eq('user_id', user.id)).data?.map((a) => a.id) ?? [],
          )
        const unpaidUtilities = (bills ?? []).filter((b) => b.status === 'unpaid').length
        return jsonResponse({
          credit_score: intel.credit_score,
          risk_band: intel.risk_band,
          risk_score: intel.risk_score,
          payment_summary: {
            on_time: intel.on_time_payments,
            late: intel.late_payments,
            missed: intel.missed_payments,
          },
          utility_summary: { unpaid_bills: unpaidUtilities },
          eligibility: recommendationForBand(intel.risk_band),
          source: 'supabase',
        })
      }

      return errorResponse('Unsupported action. Use: score, profile, dashboard', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'recompute') {
        const targetId = body.user_id ?? user.id
        const intel = await computeTenantIntelligence(admin, targetId)
        return jsonResponse({ ok: true, profile: intel })
      }
      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})

function recommendationForBand(band: string): string {
  const map: Record<string, string> = {
    approved: 'Pre-approved — reduced deposit eligible',
    standard: 'Standard eligibility — normal deposit',
    elevated: 'Elevated risk — increased deposit recommended',
    high_risk: 'High risk — manual review required',
    reject: 'Not eligible — significant payment history issues',
  }
  return map[band] ?? 'Standard eligibility'
}
