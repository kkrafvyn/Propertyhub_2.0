import { callEdgeFunction } from './edge-client'

const AUDIT_KEY = 'baytmiftah_admin_audit_log'

const syncAuditEvent = (event) =>
  callEdgeFunction('persistence', {
    method: 'POST',
    query: { action: 'save', type: 'audit_event' },
    body: event,
  })

export function getAuditEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]')
    if (stored.length) return stored
  } catch {
    return []
  }

  return [
    {
      id: 'audit-seed-1',
      actor: 'Platform Admin',
      action: 'Reviewed agency verification queue',
      entity: 'Agency',
      severity: 'info',
      created_at: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    },
    {
      id: 'audit-seed-2',
      actor: 'Trust System',
      action: 'Flagged missing ownership proof',
      entity: 'Listing',
      severity: 'warning',
      created_at: new Date(Date.now() - 1000 * 60 * 74).toISOString(),
    },
  ]
}

export async function recordAuditEvent(event) {
  const nextEvent = {
    id: `audit-${Date.now()}`,
    actor: 'Current user',
    severity: 'info',
    created_at: new Date().toISOString(),
    ...event,
  }
  const next = [nextEvent, ...getAuditEvents()].slice(0, 100)
  localStorage.setItem(AUDIT_KEY, JSON.stringify(next))

  try {
    const remote = await syncAuditEvent(nextEvent)
    return { event: { ...nextEvent, ...remote }, source: 'supabase' }
  } catch (error) {
    return { event: nextEvent, source: 'local', error: error.message }
  }
}

export function exportAuditCsv() {
  const rows = getAuditEvents()
  const header = ['created_at', 'actor', 'action', 'entity', 'severity']
  return [
    header.join(','),
    ...rows.map((row) =>
      header.map((key) => JSON.stringify(row[key] || '')).join(',')
    ),
  ].join('\n')
}
