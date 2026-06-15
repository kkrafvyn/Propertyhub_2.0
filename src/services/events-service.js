import { callEdgeFunction } from '../lib/edge-client'

export async function fetchPlatformEvents(filters = {}) {
  try {
    const query = { action: filters.action }
    if (filters.eventType) query.event_type = filters.eventType
    if (filters.aggregateType) query.aggregate_type = filters.aggregateType
    if (filters.limit) query.limit = filters.limit
    const payload = await callEdgeFunction('events', { allowAnonymous: false, query })
    if (payload?.events) return payload
  } catch { /* fallback */ }
  return { events: [], count: 0, source: 'local' }
}

export async function fetchEventTypes() {
  try {
    const payload = await callEdgeFunction('events', {
      query: { action: 'types' },
      allowAnonymous: true,
    })
    if (payload?.event_types) return payload
  } catch { /* fallback */ }
  return {
    event_types: [
      'booking.created', 'payment.completed', 'utility.meter.updated', 'tenant.risk_updated',
    ],
    transport: 'database',
    source: 'local',
  }
}

export default { fetchPlatformEvents, fetchEventTypes }
