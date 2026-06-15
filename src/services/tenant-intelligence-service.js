import { callEdgeFunction } from '../lib/edge-client'

const demoProfile = {
  credit_score: 712,
  risk_score: 22,
  risk_band: 'approved',
  deposit_multiplier: 0.5,
  on_time_payments: 8,
  late_payments: 0,
  missed_payments: 0,
  rental_history_months: 14,
}

export async function fetchTenantDashboard() {
  try {
    const payload = await callEdgeFunction('tenant', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.credit_score != null) return payload
  } catch { /* fallback */ }
  return {
    ...demoProfile,
    payment_summary: { on_time: demoProfile.on_time_payments, late: 0, missed: 0 },
    utility_summary: { unpaid_bills: 3 },
    eligibility: 'Pre-approved — reduced deposit eligible',
    source: 'local',
  }
}

export async function fetchTenantScore(recompute = false) {
  try {
    const query = { action: 'score' }
    if (recompute) query.recompute = '1'
    const payload = await callEdgeFunction('tenant', { allowAnonymous: false, query })
    if (payload?.profile) return payload
  } catch { /* fallback */ }
  return {
    profile: demoProfile,
    recommendation: 'Pre-approved — reduced deposit eligible',
    deposit_required_months: demoProfile.deposit_multiplier,
    source: 'local',
  }
}

export default { fetchTenantDashboard, fetchTenantScore }
