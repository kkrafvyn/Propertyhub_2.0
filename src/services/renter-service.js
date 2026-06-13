import { callEdgeFunction } from '../lib/edge-client'
import {
  renterProfile,
  leases,
  rentPayments,
  maintenanceRequests,
  leaseDocuments,
} from '../data/renter'

const MAINTENANCE_KEY = 'baytmiftah_maintenance'

export async function fetchRenterDashboard() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'dashboard' },
    })
    if (payload?.profile) return { ...payload, source: 'supabase' }
  } catch { /* fallback */ }
  return {
    profile: renterProfile,
    leases,
    payments: rentPayments,
    maintenance: getLocalMaintenance(),
    source: 'local',
  }
}

export async function fetchLeases() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'leases' },
    })
    if (payload?.leases?.length) return { leases: payload.leases, source: 'supabase' }
  } catch { /* fallback */ }
  return { leases, source: 'local' }
}

export async function fetchRentPayments() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'payments' },
    })
    if (payload?.payments?.length) return { payments: payload.payments, source: 'supabase' }
  } catch { /* fallback */ }
  return { payments: rentPayments, source: 'local' }
}

function getLocalMaintenance() {
  try {
    const stored = JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || '[]')
    return [...stored, ...maintenanceRequests]
  } catch {
    return maintenanceRequests
  }
}

export async function fetchMaintenanceRequests() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'maintenance' },
    })
    if (payload?.requests?.length) return { requests: payload.requests, source: 'supabase' }
  } catch { /* fallback */ }
  return { requests: getLocalMaintenance(), source: 'local' }
}

export async function submitMaintenanceRequest({ title, category, priority, notes }) {
  const request = {
    id: `mr-${Date.now()}`,
    title,
    category,
    priority,
    notes,
    status: 'open',
    submitted: new Date().toISOString().slice(0, 10),
    updated: new Date().toISOString().slice(0, 10),
  }

  try {
    return await callEdgeFunction('renter', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'create_maintenance', request },
    })
  } catch {
    const stored = JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || '[]')
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify([request, ...stored]))
    return { ok: true, request, source: 'local' }
  }
}

export async function fetchLeaseDocuments() {
  try {
    const payload = await callEdgeFunction('renter', {
      allowAnonymous: false,
      query: { action: 'lease_documents' },
    })
    if (payload?.documents?.length) return { documents: payload.documents, source: 'supabase' }
  } catch { /* fallback */ }
  return { documents: leaseDocuments, source: 'local' }
}

export async function signLeaseDocument(documentId) {
  try {
    return await callEdgeFunction('renter', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'sign_lease', document_id: documentId },
    })
  } catch {
    return { ok: true, document_id: documentId, signed_at: new Date().toISOString().slice(0, 10), source: 'local' }
  }
}

export default {
  fetchRenterDashboard,
  fetchLeases,
  fetchRentPayments,
  fetchMaintenanceRequests,
  submitMaintenanceRequest,
  fetchLeaseDocuments,
  signLeaseDocument,
}
