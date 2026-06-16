import { callEdgeFunction } from '../lib/edge-client'
import { fetchAgencyPayrollFromDb, fetchAllAgentLeadsFromDb, fetchAgencyListingsFromDb } from '../lib/supabase-db'
import {
  agencyProfile,
  teamMembers,
  leads,
  agencyListings,
  agencyBranches,
  agencyPayroll,
  agencyAnalytics,
  agencyTrust,
  agencyCompliance,
} from '../data/agency'

export async function fetchAgencyDashboard() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.agency) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return {
    agency: agencyProfile,
    team: teamMembers,
    leads,
    listings: agencyListings,
    source: 'local',
  }
}

export async function fetchTeam() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'team' },
    })
    if (payload?.team?.length) return { team: payload.team, source: 'supabase' }
  } catch { /* fallback */ }
  return { team: teamMembers, source: 'local' }
}

export async function fetchBranches() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'branches' },
    })
    if (payload?.branches?.length) return { branches: payload.branches, source: 'supabase' }
  } catch { /* fallback */ }
  return { branches: agencyBranches, source: 'local' }
}

export async function fetchPayroll() {
  const rows = await fetchAgencyPayrollFromDb()
  if (rows?.length) return { payroll: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'payroll' },
    })
    if (payload?.payroll?.length) return { payroll: payload.payroll, source: 'supabase' }
  } catch { /* fallback */ }
  return { payroll: agencyPayroll, source: 'local' }
}

export function exportPayrollCsv(payroll) {
  return payroll.map((p) => ({
    name: p.name,
    role: p.role,
    base: p.base,
    commission: p.commission,
    total: p.base + p.commission,
    status: p.status,
    period: p.period || '',
  }))
}

/** Ghana interbank ACH-style export (GCB / GhIPSS field layout) */
export function exportPayrollGhanaBank(payroll, { period = '', reference = 'BAYTMIFTAH' } = {}) {
  const payDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return payroll
    .filter((p) => p.status !== 'cancelled')
    .map((p, i) => ({
      sequence: String(i + 1).padStart(4, '0'),
      beneficiary_name: p.name,
      account_number: p.accountNumber || '',
      bank_code: p.bankCode || '',
      branch_code: p.branchCode || '',
      bank_name: p.bankName || '',
      amount: (p.base + p.commission).toFixed(2),
      currency: 'GHS',
      narration: `Payroll ${period || p.period || payDate}`,
      reference: `${reference}-${p.id}`,
      payment_date: payDate,
    }))
}

export async function runPayroll(payrollIds = []) {
  try {
    return await callEdgeFunction('agencies', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'run_payroll', payroll_ids: payrollIds },
    })
  } catch {
    const updated = payrollIds.length
      ? payrollIds
      : (await fetchPayroll()).payroll.filter((p) => p.status === 'pending').map((p) => p.id)
    return {
      ok: true,
      processed: updated.length,
      message: `Payroll run queued for ${updated.length} staff — export Ghana bank file to complete transfer.`,
      source: 'local',
    }
  }
}

export async function fetchAgencyAnalytics() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'analytics' },
    })
    if (payload?.analytics) return { analytics: payload.analytics, source: 'supabase' }
  } catch { /* fallback */ }
  return { analytics: agencyAnalytics, source: 'local' }
}

export async function fetchTrustScore() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'trust' },
    })
    if (payload?.trust) return { trust: payload.trust, source: 'supabase' }
  } catch { /* fallback */ }
  return { trust: agencyTrust, source: 'local' }
}

export async function fetchCompliance() {
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'compliance' },
    })
    if (payload?.compliance?.length) return { compliance: payload.compliance, source: 'supabase' }
  } catch { /* fallback */ }
  return { compliance: agencyCompliance, source: 'local' }
}

export async function fetchAgencyLeads() {
  const rows = await fetchAllAgentLeadsFromDb()
  if (rows?.length) return { leads: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.leads?.length) return { leads: payload.leads, source: 'supabase' }
  } catch { /* fallback */ }
  return { leads, source: 'local' }
}

export async function fetchAgencyListings() {
  const rows = await fetchAgencyListingsFromDb()
  if (rows?.length) return { listings: rows, source: 'supabase' }

  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.listings?.length) return { listings: payload.listings, source: 'supabase' }
  } catch { /* fallback */ }
  return { listings: agencyListings, source: 'local' }
}

export async function syncPayrollFromCommissions(period) {
  return callEdgeFunction('agencies', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'sync_payroll_from_commissions', period },
  })
}

export async function inviteTeamMember({ email, name, role = 'Agent' }) {
  try {
    return await callEdgeFunction('agencies', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'invite_team', email, name, role },
    })
  } catch {
    return {
      ok: true,
      member: { id: `t-${Date.now()}`, name: name ?? email.split('@')[0], role, email, status: 'invited' },
      source: 'local',
    }
  }
}

export async function addBranch({ name, location, manager }) {
  try {
    return await callEdgeFunction('agencies', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'add_branch', name, location, manager },
    })
  } catch {
    return {
      ok: true,
      branch: { id: `b-${Date.now()}`, name, location, manager: manager ?? 'TBD', agents: 0, listings: 0, status: 'active' },
      source: 'local',
    }
  }
}

export async function addComplianceItem({ item, owner, due }) {
  try {
    return await callEdgeFunction('agencies', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'add_compliance', item, owner, due },
    })
  } catch {
    return {
      ok: true,
      item: { id: `c-${Date.now()}`, item, owner: owner ?? 'Agency', due: due ?? new Date().toISOString().slice(0, 10), status: 'pending' },
      source: 'local',
    }
  }
}

export default {
  fetchAgencyDashboard,
  fetchTeam,
  fetchBranches,
  fetchPayroll,
  exportPayrollCsv,
  exportPayrollGhanaBank,
  runPayroll,
  syncPayrollFromCommissions,
  inviteTeamMember,
  addBranch,
  addComplianceItem,
  fetchAgencyAnalytics,
  fetchTrustScore,
  fetchCompliance,
  fetchAgencyLeads,
  fetchAgencyListings,
}
