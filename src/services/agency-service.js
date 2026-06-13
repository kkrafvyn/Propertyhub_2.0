import { callEdgeFunction } from '../lib/edge-client'
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
  try {
    const payload = await callEdgeFunction('agencies', {
      allowAnonymous: false,
      query: { action: 'payroll' },
    })
    if (payload?.payroll?.length) return { payroll: payload.payroll, source: 'supabase' }
  } catch { /* fallback */ }
  return { payroll: agencyPayroll, source: 'local' }
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

export default {
  fetchAgencyDashboard,
  fetchTeam,
  fetchBranches,
  fetchPayroll,
  fetchAgencyAnalytics,
  fetchTrustScore,
  fetchCompliance,
}
