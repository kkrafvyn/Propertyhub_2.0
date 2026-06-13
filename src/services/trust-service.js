import { callEdgeFunction } from '../lib/edge-client'
import { kycQueue, fraudAlerts, aiModules, supportedRegions, valuationApiDocs } from '../data/trust'
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
  try {
    const payload = await callEdgeFunction('trust', { allowAnonymous: false, query: { action: 'fraud' } })
    if (payload?.alerts?.length) return { alerts: payload.alerts, source: 'supabase' }
  } catch { /* fallback */ }
  return { alerts: fraudAlerts, source: 'local' }
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
    if (payload?.regions?.length) return { regions: payload.regions, source: 'supabase' }
  } catch { /* fallback */ }
  return { regions: supportedRegions, source: 'local' }
}

export async function fetchValuationApiDocs() {
  return { docs: valuationApiDocs, source: 'local' }
}

export async function updateKycStatus(id, status) {
  return callEdgeFunction('trust', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_kyc', id, status },
  })
}

export async function updateFraudStatus(id, status) {
  return callEdgeFunction('trust', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_fraud', id, status },
  })
}

export async function approveListing(listingId) {
  return callEdgeFunction('moderation', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'approve_listing', listing_id: listingId },
  })
}

export default {
  fetchAdminOverview,
  fetchKycQueue,
  fetchFraudAlerts,
  fetchAiOrchestration,
  fetchGlobalRegions,
  fetchValuationApiDocs,
  updateKycStatus,
  updateFraudStatus,
  approveListing,
}
