import { callEdgeFunction } from '../lib/edge-client'
import { marketplaceServices, publicAgencies, publicAgents } from '../data/marketplace-services'

export async function fetchMarketplaceServices() {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'services' },
    })
    if (payload?.services?.length) return { services: payload.services, source: payload.source ?? 'supabase' }
  } catch {
    /* fallback */
  }
  return { services: marketplaceServices, source: 'local' }
}

export async function requestMarketplaceService({ serviceId, message }) {
  try {
    const payload = await callEdgeFunction('marketplace', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'request_service', service_id: serviceId, message },
    })
    if (payload?.ok) return { ok: true, request: payload.request, source: 'supabase' }
  } catch (err) {
    return { ok: false, error: err.message, source: 'local' }
  }
  return { ok: false, error: 'Request failed', source: 'local' }
}

export async function fetchPublicAgencies() {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'public_list', type: 'agency' },
    })
    if (payload?.agencies?.length) return { agencies: payload.agencies, source: payload.source ?? 'supabase' }
  } catch {
    /* fallback */
  }
  return { agencies: publicAgencies, source: 'local' }
}

export async function fetchPublicAgency(id) {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'public_profile', type: 'agency', id },
    })
    if (payload?.agency) {
      return {
        agency: payload.agency,
        reputation: payload.reputation ?? null,
        source: payload.source ?? 'supabase',
      }
    }
  } catch {
    /* fallback */
  }
  const agency = publicAgencies.find((a) => a.id === id)
  return { agency: agency ?? null, reputation: null, source: agency ? 'local' : 'none' }
}

export async function fetchPublicAgents() {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'public_list', type: 'agent' },
    })
    if (payload?.agents?.length) return { agents: payload.agents, source: payload.source ?? 'supabase' }
  } catch {
    /* fallback */
  }
  return { agents: publicAgents, source: 'local' }
}

export async function fetchPublicAgent(id) {
  try {
    const payload = await callEdgeFunction('marketplace', {
      allowAnonymous: true,
      query: { action: 'public_profile', type: 'agent', id },
    })
    if (payload?.agent) {
      return {
        agent: payload.agent,
        reputation: payload.reputation ?? null,
        source: payload.source ?? 'supabase',
      }
    }
  } catch {
    /* fallback */
  }
  const agent = publicAgents.find((a) => a.id === id)
  return { agent: agent ?? null, reputation: null, source: agent ? 'local' : 'none' }
}
