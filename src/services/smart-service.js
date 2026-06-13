import { callEdgeFunction } from '../lib/edge-client'
import {
  smartPortfolio,
  smartDevices,
  automations,
  smartAlerts,
  eventLogs,
} from '../data/smart'

export async function fetchSmartDashboard() {
  try {
    const payload = await callEdgeFunction('smart', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.portfolio) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return { portfolio: smartPortfolio, source: 'local' }
}

export async function fetchDevices() {
  try {
    const payload = await callEdgeFunction('smart', {
      allowAnonymous: false,
      query: { action: 'devices' },
    })
    if (payload?.devices?.length) return { devices: payload.devices, source: 'supabase' }
  } catch { /* fallback */ }
  return { devices: smartDevices, source: 'local' }
}

export async function fetchAutomations() {
  try {
    const payload = await callEdgeFunction('smart', {
      allowAnonymous: false,
      query: { action: 'automations' },
    })
    if (payload?.automations?.length) return { automations: payload.automations, source: 'supabase' }
  } catch { /* fallback */ }
  return { automations, source: 'local' }
}

export async function fetchAlertsAndLogs() {
  try {
    const payload = await callEdgeFunction('smart', {
      allowAnonymous: false,
      query: { action: 'alerts' },
    })
    if (payload?.alerts) return { alerts: payload.alerts, logs: payload.logs, source: 'supabase' }
  } catch { /* fallback */ }
  return { alerts: smartAlerts, logs: eventLogs, source: 'local' }
}

export async function toggleAutomation(id, enabled) {
  try {
    return await callEdgeFunction('smart', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'toggle_automation', automation_id: id, enabled },
    })
  } catch {
    return { ok: true, source: 'local' }
  }
}

export default {
  fetchSmartDashboard,
  fetchDevices,
  fetchAutomations,
  fetchAlertsAndLogs,
  toggleAutomation,
}
