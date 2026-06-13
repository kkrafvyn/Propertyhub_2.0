import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { logAudit } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (req.method === 'GET') {
    if (action === 'overview') {
      const [{ count: kycPending }, { count: fraudOpen }, { data: pendingListings }] = await Promise.all([
        admin.from('kyc_records').select('*', { count: 'exact', head: true }).neq('status', 'verified'),
        admin.from('fraud_alerts').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
        admin.from('listings').select('id, title, status').eq('status', 'pending_review'),
      ])
      const { data: audit } = await admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(10)
      return jsonResponse({
        overview: {
          pendingAgencies: [], moderationQueue: pendingListings ?? [],
          auditEvents: audit ?? [], kycPending: kycPending ?? 0, fraudOpen: fraudOpen ?? 0,
        },
        source: 'supabase',
      })
    }
    if (action === 'kyc') {
      const { data } = await admin.from('kyc_records').select('*').order('created_at', { ascending: false })
      const kyc = (data ?? []).map((r) => ({
        id: r.id, entity: r.entity_name, type: r.entity_type, status: r.status, documents: r.documents,
      }))
      return jsonResponse({ kyc, source: 'supabase' })
    }
    if (action === 'fraud') {
      const { data } = await admin.from('fraud_alerts').select('*').order('created_at', { ascending: false })
      const alerts = (data ?? []).map((r) => ({
        id: r.id, target: r.target, type: r.alert_type, riskScore: r.risk_score, status: r.status,
      }))
      return jsonResponse({ alerts, source: 'supabase' })
    }
    if (action === 'ai_modules') {
      const { data } = await admin.from('ai_modules').select('*')
      return jsonResponse({ modules: data ?? [], source: 'supabase' })
    }
    if (action === 'regions') {
      return jsonResponse({
        regions: [
          { code: 'GH', name: 'Ghana', currency: 'GHS', active: true },
          { code: 'NG', name: 'Nigeria', currency: 'NGN', active: true },
          { code: 'KE', name: 'Kenya', currency: 'KES', active: false },
        ],
        source: 'supabase',
      })
    }
    return errorResponse('Unsupported action', 404)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    if (body.action === 'update_kyc') {
      await admin.from('kyc_records').update({ status: body.status }).eq('id', body.id)
      await logAudit(admin, user.id, 'kyc_updated', body.id, { status: body.status })
      return jsonResponse({ ok: true })
    }
    if (body.action === 'update_fraud') {
      await admin.from('fraud_alerts').update({ status: body.status }).eq('id', body.id)
      await logAudit(admin, user.id, 'fraud_updated', body.id, { status: body.status })
      return jsonResponse({ ok: true })
    }
    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Method not allowed', 405)
})
