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
    if (action === 'fraud_rules') {
      const { data } = await admin.from('fraud_rules').select('*').eq('enabled', true)
      return jsonResponse({ rules: data ?? [], source: 'supabase' })
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
    if (body.action === 'run_fraud_scan') {
      const { data: rules } = await admin.from('fraud_rules').select('*').eq('enabled', true)
      const { data: listings } = await admin.from('listings').select('id, title, price, submitted_by, created_at').eq('status', 'active').limit(200)
      const alerts: Array<{ target: string; alert_type: string; risk_score: number }> = []

      const byUser = new Map<string, number>()
      for (const l of listings ?? []) {
        const uid = l.submitted_by ?? 'unknown'
        byUser.set(uid, (byUser.get(uid) ?? 0) + 1)
      }

      const velocityRule = rules?.find((r) => r.id === 'velocity_listings')
      if (velocityRule) {
        for (const [uid, count] of byUser) {
          if (count > Number(velocityRule.threshold)) {
            alerts.push({ target: `User ${uid.slice(0, 8)}…`, alert_type: 'velocity', risk_score: Math.min(99, count * 12) })
          }
        }
      }

      const prices = (listings ?? []).map((l) => Number(l.price)).filter((p) => p > 0)
      const median = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0
      const anomalyRule = rules?.find((r) => r.id === 'price_anomaly')
      if (median && anomalyRule) {
        for (const l of listings ?? []) {
          const pct = ((median - Number(l.price)) / median) * 100
          if (pct > Number(anomalyRule.threshold)) {
            alerts.push({ target: l.title, alert_type: 'price_anomaly', risk_score: Math.min(99, Math.round(pct)) })
          }
        }
      }

      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (openaiKey && body.use_ml !== false) {
        try {
          const sample = (listings ?? []).slice(0, 5).map((l) => ({ id: l.id, title: l.title, price: l.price }))
          const mlRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: `Score fraud risk 0-100 for these property listings JSON. Return JSON array [{id,risk_score,reason}]: ${JSON.stringify(sample)}`,
              }],
              response_format: { type: 'json_object' },
            }),
          })
          const ml = await mlRes.json()
          const content = ml?.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            const items = parsed.items ?? parsed.listings ?? parsed.results ?? []
            for (const item of items) {
              if (item.risk_score >= 60) {
                alerts.push({
                  target: item.id ?? item.title ?? 'Listing',
                  alert_type: 'ml_classifier',
                  risk_score: Number(item.risk_score),
                })
              }
            }
          }
        } catch (e) {
          console.error('ML fraud scan failed', e)
        }
      }

      for (const a of alerts.slice(0, 20)) {
        await admin.from('fraud_alerts').insert({
          id: `fa-${crypto.randomUUID().slice(0, 8)}`,
          target: a.target,
          alert_type: a.alert_type,
          risk_score: a.risk_score,
          status: 'investigating',
        }).catch(() => null)
      }

      return jsonResponse({ ok: true, scanned: listings?.length ?? 0, alerts_created: Math.min(alerts.length, 20), source: 'supabase' })
    }
    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Method not allowed', 405)
})
