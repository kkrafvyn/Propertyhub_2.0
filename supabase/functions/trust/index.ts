import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { logAudit } from '../_shared/user-seed.ts'
import {
  canAssignRole,
  getProfileRole,
  isFullAdminRole,
  isStaffRole,
} from '../_shared/roles.ts'
import { computeReputationScore } from '../_shared/reputation.ts'
import {
  createSmileLink,
  getSmileConfig,
  mapSmileResultToKycStatus,
} from '../_shared/smile-identity.ts'

function mapKycRow(r: Record<string, unknown>) {
  const paths = Array.isArray(r.document_paths) ? r.document_paths : []
  return {
    id: r.id,
    entity: r.entity_name,
    name: r.entity_name,
    type: r.entity_type,
    entity_type: r.entity_type,
    status: r.status,
    documents: r.documents ?? paths.length,
    document_paths: paths,
    provider: r.provider,
    provider_job_id: r.provider_job_id,
    provider_ref_id: r.provider_ref_id,
    provider_status: r.provider_status,
    rejection_reason: r.rejection_reason,
    reviewed_at: r.reviewed_at,
    user_id: r.user_id,
    created_at: r.created_at,
  }
}

async function signedKycDocumentUrls(admin: ReturnType<typeof createAdminClient>, paths: string[]) {
  const urls: Array<{ path: string; url: string | null }> = []
  for (const path of paths) {
    const { data, error } = await admin.storage.from('kyc').createSignedUrl(String(path), 3600)
    urls.push({ path: String(path), url: error ? null : data?.signedUrl ?? null })
  }
  return urls
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const admin = createAdminClient()

  if (req.method === 'GET' && (action === 'reputation' || action === 'public_reputation')) {
    const targetId = url.searchParams.get('user_id')
    if (!targetId) return errorResponse('user_id required', 400)
    const score = await computeReputationScore(admin, targetId)
    return jsonResponse({ reputation: score, source: 'supabase' })
  }

  if (req.method === 'GET' && action === 'kyc_provider_config') {
    const smile = getSmileConfig()
    const siteUrl = smile?.siteUrl ?? (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
    return jsonResponse({
      provider: smile ? 'smile' : 'manual',
      smileConfigured: Boolean(smile),
      redirectPath: '/profile/kyc',
      callbackUrl: siteUrl
        ? `${Deno.env.get('SUPABASE_URL')}/functions/v1/trust?action=kyc_webhook`
        : null,
      source: 'supabase',
    })
  }

  if (req.method === 'POST' && action === 'kyc_webhook') {
    let body: Record<string, unknown> = {}
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON', 400)
    }

    const partnerParams = (body.partner_params ?? body.PartnerParams ?? {}) as Record<string, unknown>
    const kycRecordId = String(partnerParams.kyc_record_id ?? partnerParams.job_id ?? '')
    const resultCode = body.ResultCode ?? body.result_code ?? body.resultCode
    const resultText = String(body.ResultText ?? body.result_text ?? body.resultText ?? '')
    const status = mapSmileResultToKycStatus(resultCode as string | number | undefined)

    if (!kycRecordId) {
      return jsonResponse({ ok: true, ignored: true, reason: 'no_kyc_record_id' })
    }

    const update: Record<string, unknown> = {
      provider: 'smile',
      provider_status: String(resultCode ?? ''),
      status,
      reviewed_at: status !== 'pending_review' ? new Date().toISOString() : null,
    }
    if (status === 'rejected') {
      update.rejection_reason = resultText || 'Verification failed'
    }

    await admin.from('kyc_records').update(update).eq('id', kycRecordId)
    return jsonResponse({ ok: true, status, source: 'supabase' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const requesterRole = await getProfileRole(admin, user.id)

  if (req.method === 'GET') {
    if (action === 'my_kyc') {
      const { data } = await admin
        .from('kyc_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return jsonResponse({ kyc: data, source: 'supabase' })
    }

    if (action === 'reputation') {
      const targetId = url.searchParams.get('user_id') ?? user.id
      const { data: existing } = await admin.from('reputation_scores').select('*').eq('user_id', targetId).maybeSingle()
      if (!existing || targetId === user.id) {
        const score = await computeReputationScore(admin, targetId)
        return jsonResponse({ reputation: score, source: 'supabase' })
      }
      return jsonResponse({ reputation: existing, source: 'supabase' })
    }

    if (action === 'users') {
      if (!isFullAdminRole(requesterRole)) return errorResponse('Forbidden', 403)
      const { data, error } = await admin
        .from('user_profiles')
        .select('id, email, display_name, role, updated_at')
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) return errorResponse(error.message, 500)
      return jsonResponse({ users: data ?? [], source: 'supabase' })
    }

    if (!isStaffRole(requesterRole)) return errorResponse('Forbidden', 403)

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
      const kyc = (data ?? []).map((r) => mapKycRow(r as Record<string, unknown>))
      return jsonResponse({ kyc, source: 'supabase' })
    }
    if (action === 'kyc_documents') {
      const recordId = url.searchParams.get('id')
      if (!recordId) return errorResponse('id required', 400)
      const { data: record } = await admin.from('kyc_records').select('document_paths').eq('id', recordId).maybeSingle()
      const paths = Array.isArray(record?.document_paths) ? record.document_paths : []
      const documents = await signedKycDocumentUrls(admin, paths)
      return jsonResponse({ documents, source: 'supabase' })
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
      if (!isFullAdminRole(requesterRole)) return errorResponse('Forbidden', 403)
      const { data } = await admin.from('ai_modules').select('*')
      return jsonResponse({ modules: data ?? [], source: 'supabase' })
    }
    if (action === 'regions') {
      if (!isFullAdminRole(requesterRole)) return errorResponse('Forbidden', 403)
      const listingCounts = await Promise.all([
        admin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ])
      const totalListings = listingCounts[0]?.count ?? 0
      return jsonResponse({
        regions: [
          { code: 'GH', name: 'Ghana', currency: 'GHS', active: true, status: 'live', listings: totalListings },
          { code: 'NG', name: 'Nigeria', currency: 'NGN', active: true, status: 'beta', listings: 0 },
          { code: 'KE', name: 'Kenya', currency: 'KES', active: false, status: 'planned', listings: 0 },
        ],
        source: 'supabase',
      })
    }
    return errorResponse('Unsupported action', 404)
  }

  if (req.method === 'POST') {
    const body = await req.json()

    if (body.action === 'start_kyc_provider') {
      const smile = getSmileConfig()
      if (!smile) return errorResponse('Smile Identity is not configured', 503)

      const entityName = String(body.entityName ?? '').trim()
      const entityType = String(body.entityType ?? 'consumer').trim()
      if (!entityName) return errorResponse('entityName required', 400)

      const { data: existing } = await admin
        .from('kyc_records')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending_review', 'verified', 'pending_provider'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing?.status === 'verified') return errorResponse('Already verified', 400)
      if (existing?.status === 'pending_review' || existing?.status === 'pending_provider') {
        return errorResponse('Verification already in progress', 400)
      }

      const id = `kyc-${crypto.randomUUID().slice(0, 8)}`
      const jobId = id
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/trust?action=kyc_webhook`
      const redirectUrl = `${smile.siteUrl}/profile/kyc?smile=return`

      const { link, refId } = await createSmileLink({
        config: smile,
        userId: user.id,
        jobId,
        entityName,
        callbackUrl,
        redirectUrl,
      })

      const { error } = await admin.from('kyc_records').insert({
        id,
        user_id: user.id,
        entity_name: entityName,
        entity_type: entityType,
        status: 'pending_provider',
        documents: 0,
        document_paths: [],
        provider: 'smile',
        provider_job_id: jobId,
        provider_ref_id: refId,
        provider_status: 'link_created',
      })
      if (error) return errorResponse(error.message, 500)

      await logAudit(admin, user.id, 'kyc_provider_started', id, { provider: 'smile', refId })
      return jsonResponse({ ok: true, id, link, provider: 'smile', source: 'supabase' })
    }

    if (body.action === 'submit_kyc') {
      const entityName = String(body.entityName ?? '').trim()
      const entityType = String(body.entityType ?? 'consumer').trim()
      const documentPaths = Array.isArray(body.documentPaths) ? body.documentPaths : []

      if (!entityName) return errorResponse('entityName required', 400)
      if (!documentPaths.length) return errorResponse('At least one document required', 400)

      const { data: existing } = await admin
        .from('kyc_records')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending_review', 'verified', 'pending_provider'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing?.status === 'verified') return errorResponse('Already verified', 400)
      if (existing?.status === 'pending_review' || existing?.status === 'pending_provider') {
        return errorResponse('Submission already pending review', 400)
      }

      const id = `kyc-${crypto.randomUUID().slice(0, 8)}`
      const { error } = await admin.from('kyc_records').insert({
        id,
        user_id: user.id,
        entity_name: entityName,
        entity_type: entityType,
        status: 'pending_review',
        documents: documentPaths.length,
        document_paths: documentPaths,
        provider: 'manual',
      })
      if (error) return errorResponse(error.message, 500)

      await logAudit(admin, user.id, 'kyc_submitted', id, { entityType, documents: documentPaths.length })
      return jsonResponse({ ok: true, id, status: 'pending_review', source: 'supabase' })
    }

    if (body.action === 'promote_user') {
      if (!canAssignRole(requesterRole, body.role)) {
        return errorResponse('Forbidden', 403)
      }
      if (!body.userId || !body.role) return errorResponse('userId and role required', 400)

      const { error: profileError } = await admin
        .from('user_profiles')
        .update({ role: body.role, updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (profileError) return errorResponse(profileError.message, 500)

      await admin.auth.admin.updateUserById(body.userId, {
        user_metadata: { role: body.role },
        app_metadata: { role: body.role },
      }).catch(() => null)

      await logAudit(admin, user.id, 'user_role_updated', body.userId, { role: body.role })
      return jsonResponse({ ok: true, role: body.role, source: 'supabase' })
    }

    if (!isStaffRole(requesterRole)) return errorResponse('Forbidden', 403)

    if (body.action === 'update_kyc') {
      const allowed = ['verified', 'rejected', 'pending_review', 'flagged']
      const status = String(body.status ?? '')
      if (!allowed.includes(status)) return errorResponse('Invalid status', 400)

      const patch: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
      }
      if (status === 'rejected' && body.rejectionReason) {
        patch.rejection_reason = String(body.rejectionReason)
      }
      if (status === 'verified') {
        patch.rejection_reason = null
      }

      await admin.from('kyc_records').update(patch).eq('id', body.id)
      await logAudit(admin, user.id, 'kyc_updated', body.id, { status, rejectionReason: body.rejectionReason })
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
        const { error: insertError } = await admin.from('fraud_alerts').insert({
          id: `fa-${crypto.randomUUID().slice(0, 8)}`,
          target: a.target,
          alert_type: a.alert_type,
          risk_score: a.risk_score,
          status: 'investigating',
        })
        if (insertError) console.error('fraud alert insert failed', insertError.message)
      }

      return jsonResponse({ ok: true, scanned: listings?.length ?? 0, alerts_created: Math.min(alerts.length, 20), source: 'supabase' })
    }
    return errorResponse('Unsupported action', 404)
  }

  return errorResponse('Method not allowed', 405)
})
