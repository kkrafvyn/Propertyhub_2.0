import { callEdgeFunction } from '../lib/edge-client'
import {
  fetchFraudAlertsFromDb,
  updateFraudAlertInDb,
  fetchFraudRulesFromDb,
} from '../lib/supabase-db'
import { kycQueue, fraudAlerts, fraudRules, aiModules, supportedRegions, valuationApiDocs } from '../data/trust'
import { pendingAgencies, moderationQueue, auditEvents } from '../data/enterprise'

export async function fetchAdminOverview() {
  try {
    const payload = await callEdgeFunction('trust', {
      allowAnonymous: false,
      query: { action: 'overview' },
    })
    if (payload?.overview) return { ...payload.overview, source: 'supabase' }
  } catch { /* fallback */ }
  return { pendingAgencies, moderationQueue, auditEvents, kycPending: kycQueue.filter((k) => k.status !== 'verified').length, fraudOpen: fraudAlerts.filter((f) => f.status !== 'blocked').length, source: 'local' }
}

export async function fetchKycQueue() {
  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'kyc' } })
    if (payload?.kyc?.length) return { kyc: payload.kyc, source: 'supabase' }
  } catch { /* fallback */ }
  return { kyc: kycQueue, source: 'local' }
}

export async function fetchFraudAlerts() {
  const rows = await fetchFraudAlertsFromDb()
  if (rows?.length) return { alerts: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'fraud' } })
    if (payload?.alerts?.length) return { alerts: payload.alerts, source: 'supabase' }
  } catch { /* fallback */ }
  return { alerts: fraudAlerts, source: 'local' }
}

export async function fetchFraudRules() {
  const rows = await fetchFraudRulesFromDb()
  if (rows?.length) return { rules: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'fraud_rules' } })
    if (payload?.rules?.length) return { rules: payload.rules, source: 'supabase' }
  } catch { /* fallback */ }
  return { rules: fraudRules, source: 'local' }
}

export function scoreFraudAlert(alert, rules) {
  const rule = rules.find((r) => alert.type?.includes(r.rule_type?.split('_')[0]) || alert.alert_type?.includes(r.rule_type?.split('_')[0]))
  const base = alert.riskScore ?? alert.risk_score ?? 50
  if (!rule) return base
  const threshold = Number(rule.threshold) || 50
  return Math.min(100, Math.round(base * (100 / Math.max(threshold, 1))))
}

export async function fetchAiOrchestration() {
  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'ai_modules' } })
    if (payload?.modules?.length) return { modules: payload.modules, source: 'supabase' }
  } catch { /* fallback */ }
  return { modules: aiModules, source: 'local' }
}

export async function fetchGlobalRegions() {
  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'regions' } })
    if (payload?.regions?.length) {
      return {
        regions: payload.regions.map(normalizeGlobalRegion),
        source: payload.source ?? 'supabase',
      }
    }
  } catch { /* fallback */ }
  return { regions: supportedRegions, source: 'local' }
}

function normalizeGlobalRegion(r) {
  return {
    code: r.code,
    name: r.name,
    currency: r.currency,
    listings: r.listings ?? 0,
    status: r.status ?? (r.active === false ? 'planned' : r.active === true ? 'live' : 'beta'),
  }
}

export async function fetchValuationApiDocs() {
  return { docs: valuationApiDocs, source: 'local' }
}

const KYC_STORAGE_KEY = 'baytmiftah_kyc'

export async function fetchMyReputation(userId) {
  try {
    const query = userId ? { action: 'reputation', user_id: userId } : { action: 'reputation' }
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query })
    if (payload?.reputation) return { reputation: payload.reputation, source: 'supabase' }
  } catch { /* fallback */ }
  return {
    reputation: {
      score: 50,
      factors: { review_count: 0, payments: 0, badges: [] },
      badges: [],
    },
    source: 'local',
  }
}

export async function fetchPublicReputation(userId) {
  try {
    const payload = await callEdgeFunction('trust', {
      allowAnonymous: true,
      query: { action: 'public_reputation', user_id: userId },
    })
    if (payload?.reputation) return { reputation: payload.reputation, source: 'supabase' }
  } catch { /* fallback */ }
  return { reputation: { score: 88, factors: {}, badges: ['Verified'] }, source: 'local' }
}

export async function fetchMyKyc() {
  try {
    const payload = await callEdgeFunction('trust', {
      allowAnonymous: false,
      query: { action: 'my_kyc' },
    })
    if (payload && 'kyc' in payload) {
      return { kyc: payload.kyc, source: payload.source ?? 'supabase' }
    }
  } catch { /* fallback */ }

  try {
    const raw = localStorage.getItem(KYC_STORAGE_KEY)
    return { kyc: raw ? JSON.parse(raw) : null, source: 'local' }
  } catch {
    return { kyc: null, source: 'local' }
  }
}

export async function submitKyc({ entityName, entityType, documentPaths }) {
  try {
    return await callEdgeFunction('trust', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'submit_kyc', entityName, entityType, documentPaths },
    })
  } catch (err) {
    const record = {
      id: `local-kyc-${Date.now()}`,
      entity_name: entityName,
      entity_type: entityType,
      status: 'pending_review',
      documents: documentPaths.length,
      document_paths: documentPaths,
      created_at: new Date().toISOString(),
    }
    try {
      localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(record))
    } catch { /* ignore */ }
    return { ok: true, id: record.id, status: 'pending_review', source: 'local' }
  }
}

export async function updateKycStatus(id, status) {
  return callEdgeFunction('trust', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_kyc', id, status },
  })
}

export async function updateFraudStatus(id, status) {
  if (await updateFraudAlertInDb(id, status)) {
    return { ok: true, source: 'supabase' }
  }
  return callEdgeFunction('trust', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_fraud', id, status },
  })
}

export async function runFraudScan(useMl = true) {
  try {
    return await callEdgeFunction('trust', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'run_fraud_scan', use_ml: useMl },
    })
  } catch {
    return { ok: true, scanned: 0, alerts_created: 0, source: 'local' }
  }
}

export async function approveListing(listingId) {
  return callEdgeFunction('moderation', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'approve_listing', listing_id: listingId },
  })
}

export async function fetchAdminUsers() {
  try {
    const payload = await callEdgeFunction('trust', {
      allowAnonymous: false,
      query: { action: 'users' },
    })
    if (payload?.users) return { users: payload.users, source: payload.source ?? 'supabase' }
  } catch { /* fallback */ }
  const { demoAdminUsers } = await import('../data/admin-users')
  return { users: demoAdminUsers, source: 'local' }
}

export async function promoteUserRole(userId, role) {
  try {
    return await callEdgeFunction('trust', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'promote_user', userId, role },
    })
  } catch (err) {
    if (userId.startsWith('demo-')) {
      return { ok: true, source: 'local', role }
    }
    throw err
  }
}

export default {
  fetchAdminOverview,
  fetchKycQueue,
  fetchMyKyc,
  submitKyc,
  fetchFraudAlerts,
  fetchFraudRules,
  scoreFraudAlert,
  fetchAiOrchestration,
  fetchGlobalRegions,
  fetchValuationApiDocs,
  updateKycStatus,
  updateFraudStatus,
  runFraudScan,
  approveListing,
  fetchAdminUsers,
  promoteUserRole,
}
