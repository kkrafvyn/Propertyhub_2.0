import { callEdgeFunction } from '../lib/edge-client'
import {
  demoHostDashboard,
  demoReservations,
  demoHostPayouts,
} from '../data/os-platform'

export async function fetchHostDashboard() {
  try {
    const payload = await callEdgeFunction('host', { allowAnonymous: false, query: { action: 'dashboard' } })
    if (payload?.stats) return payload
  } catch { /* fallback */ }
  return { stats: demoHostDashboard, source: 'local' }
}

export async function fetchHostReservations() {
  try {
    const payload = await callEdgeFunction('host', { allowAnonymous: false, query: { action: 'reservations' } })
    if (payload?.reservations) return payload
  } catch { /* fallback */ }
  return { reservations: demoReservations, source: 'local' }
}

export async function fetchHostCalendar(listingId) {
  try {
    const payload = await callEdgeFunction('host', {
      allowAnonymous: false,
      query: { action: 'calendar', listing_id: listingId },
    })
    if (payload?.availability) return payload
  } catch { /* fallback */ }
  return { availability: [], source: 'local' }
}

export async function fetchHostPayouts() {
  try {
    const payload = await callEdgeFunction('host', { allowAnonymous: false, query: { action: 'payouts' } })
    if (payload?.payouts) return payload
  } catch { /* fallback */ }
  return { payouts: demoHostPayouts, source: 'local' }
}

export async function updateReservationStatus(reservationId, status) {
  return callEdgeFunction('host', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'update_reservation', reservation_id: reservationId, status },
  })
}

export async function saveAvailability(listingId, dates) {
  return callEdgeFunction('host', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'save_availability', listing_id: listingId, dates },
  })
}
