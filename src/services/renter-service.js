import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import {
  fetchLeaseDocumentsFromDb,
  signLeaseDocumentInDb,
} from '../lib/supabase-db'
import {
  renterProfile,
  leases,
  rentPayments,
  maintenanceRequests,
  leaseDocuments,
} from '../data/renter'

const MAINTENANCE_KEY = 'baytmiftah_maintenance'
const AUTOPAY_KEY = 'baytmiftah_renter_autopay'
const REMINDER_KEY = 'baytmiftah_rent_reminders_sent'

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

export async function submitMaintenanceRequest({ title, category, priority, notes, photoDataUrl = null }) {
  const request = {
    id: `mr-${Date.now()}`,
    title,
    category,
    priority,
    notes,
    photo: photoDataUrl,
    status: 'open',
    submitted: new Date().toISOString().slice(0, 10),
    updated: new Date().toISOString().slice(0, 10),
  }

  try {
    const result = await callEdgeFunction('renter', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'create_maintenance', request },
    })
    await notifyLandlordMaintenance(request)
    return result
  } catch {
    const stored = JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || '[]')
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify([request, ...stored]))
    await notifyLandlordMaintenance(request)
    return { ok: true, request, source: 'local' }
  }
}

async function notifyLandlordMaintenance(request) {
  try {
    const { sendEmail } = await import('./email-service')
    await sendEmail({
      to: 'landlord@baytmiftah.local',
      subject: `Maintenance: ${request.title}`,
      body: `<p>New ${request.priority} priority request (${request.category}).</p><p>${request.notes || request.title}</p>`,
    })
    const { notifyCurrentUser } = await import('./notification-service')
    await notifyCurrentUser({
      type: 'maintenance',
      title: 'Maintenance request submitted',
      body: request.title,
      link: '/renter/maintenance',
    })
  } catch {
    /* optional */
  }
}

export function getAutopayEnabled() {
  try {
    return localStorage.getItem(AUTOPAY_KEY) === '1'
  } catch {
    return false
  }
}

export function setAutopayEnabled(enabled) {
  localStorage.setItem(AUTOPAY_KEY, enabled ? '1' : '0')
  return enabled
}

export async function triggerRentDueReminders(payments, userEmail) {
  if (!payments?.length || !userEmail) return { sent: 0 }
  let sent = 0
  const reminded = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]')
  const { sendPaymentDueReminder } = await import('./email-service')
  const { sendSms } = await import('./comms-service')

  for (const p of payments.filter((x) => x.status === 'due')) {
    if (reminded.includes(p.id)) continue
    await sendPaymentDueReminder({
      to: userEmail,
      period: p.period,
      amount: p.amount,
      dueDate: p.due,
    })
    if (p.phone) {
      await sendSms({
        phone: p.phone,
        body: `BaytMiftah: Rent GHS ${p.amount} due ${p.due} for ${p.period}.`,
        template: 'payment_due',
      })
    }
    reminded.push(p.id)
    sent += 1
  }
  localStorage.setItem(REMINDER_KEY, JSON.stringify(reminded))
  return { sent }
}

export async function fetchLeaseDocuments() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const rows = await fetchLeaseDocumentsFromDb(user.id)
      if (rows?.length) return { documents: rows, source: 'supabase' }
    }
  }
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
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await signLeaseDocumentInDb(user.id, documentId)) {
      return { ok: true, document_id: documentId, signed_at: new Date().toISOString().slice(0, 10), source: 'supabase' }
    }
  }
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
  getAutopayEnabled,
  setAutopayEnabled,
  triggerRentDueReminders,
}
