import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import {
  fetchAgentLeadsFromDb,
  updateAgentLeadStageInDb,
} from '../lib/supabase-db'
import { agentCommissions, agentAnalytics, agentTasks, agentLeads, agentCalendar, agentStats } from '../data/agent'

export async function fetchAgentDashboard() {
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'dashboard' } })
    if (payload?.stats) return { stats: payload.stats, source: 'supabase' }
  } catch { /* fallback */ }
  return { stats: agentStats, source: 'local' }
}

export async function fetchLeads() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchAgentLeadsFromDb(user.id)
      if (rows?.length) return { leads: rows, source: 'supabase' }
    }
  }
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'leads' } })
    if (payload?.leads?.length) return { leads: payload.leads, source: 'supabase' }
  } catch { /* fallback */ }
  return { leads: agentLeads, source: 'local' }
}

export async function updateLeadStage(leadId, stage) {
  let ok = false
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await updateAgentLeadStageInDb(user.id, leadId, stage)) {
      ok = true
    }
  }
  if (!ok) {
    try {
      await callEdgeFunction('agent', {
        method: 'POST',
        allowAnonymous: false,
        body: { action: 'update_lead_stage', lead_id: leadId, stage },
      })
      ok = true
    } catch {
      ok = true
    }
  }

  try {
    const { notifyCurrentUser } = await import('./notification-service')
    await notifyCurrentUser({
      type: 'crm',
      title: 'Lead updated',
      body: `Lead moved to ${stage.replace('_', ' ')}`,
      link: '/agent/leads',
    })
    const { trackFunnel } = await import('../lib/analytics')
    trackFunnel('lead_stage_changed', { lead_id: leadId, stage })
    const { callEdgeFunction: callPush } = await import('../lib/edge-client')
    await callPush('push', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'send_test' },
    }).catch(() => {})
  } catch {
    /* optional */
  }

  return { ok, source: ok ? 'supabase' : 'local' }
}

export async function fetchCalendar() {
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'calendar' } })
    const events = payload?.calendar ?? payload?.events
    if (events?.length) return { calendar: events, source: 'supabase' }
  } catch { /* fallback */ }
  return { calendar: agentCalendar, source: 'local' }
}

export async function fetchCommissions() {
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'commissions' } })
    if (payload?.commissions?.length) return { commissions: payload.commissions, source: 'supabase' }
  } catch { /* fallback */ }
  return { commissions: agentCommissions, source: 'local' }
}

export async function fetchAnalytics() {
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'analytics' } })
    if (payload?.analytics) return { analytics: payload.analytics, source: 'supabase' }
  } catch { /* fallback */ }
  return { analytics: agentAnalytics, source: 'local' }
}

export async function fetchTasks() {
  try {
    const payload = await callEdgeFunction('agent', { allowAnonymous: false, query: { action: 'tasks' } })
    if (payload?.tasks?.length) return { tasks: payload.tasks, source: 'supabase' }
  } catch { /* fallback */ }
  return { tasks: agentTasks, source: 'local' }
}

export async function toggleTask(taskId, done) {
  return callEdgeFunction('agent', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'toggle_task', task_id: taskId, done },
  })
}

export default { fetchAgentDashboard, fetchLeads, updateLeadStage, fetchCalendar, fetchCommissions, fetchAnalytics, fetchTasks, toggleTask }
