import { callEdgeFunction } from '../lib/edge-client'
import { demoReservations } from '../data/os-platform'

export async function fetchReservations(asGuest = true) {
  try {
    const payload = await callEdgeFunction('reservations', {
      allowAnonymous: false,
      query: { action: asGuest ? 'guest' : 'host' },
    })
    if (payload?.reservations) return payload
  } catch { /* fallback */ }
  return { reservations: demoReservations, source: 'local' }
}

export async function createReservation({ listingId, checkIn, checkOut, guests = 1, total }) {
  try {
    return await callEdgeFunction('reservations', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'create',
        listing_id: listingId,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        total,
      },
    })
  } catch (error) {
    return { ok: false, error: error.message, demo: true }
  }
}

export async function fetchListingAvailability(listingId) {
  try {
    const payload = await callEdgeFunction('reservations', {
      allowAnonymous: true,
      query: { action: 'availability', listing_id: listingId },
    })
    if (payload?.availability) return payload
  } catch { /* fallback */ }
  return { availability: [], source: 'local' }
}
