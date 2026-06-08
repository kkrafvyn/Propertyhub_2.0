import { callEdgeFunction } from './edge-client'

const BOOKING_KEY = 'baytmiftah_booking_requests'

export function getLocalBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]')
  } catch {
    return []
  }
}

export async function createViewingRequest(payload) {
  const request = {
    id: `booking-${Date.now()}`,
    status: 'requested',
    created_at: new Date().toISOString(),
    ...payload,
  }

  const local = [request, ...getLocalBookings()]
  localStorage.setItem(BOOKING_KEY, JSON.stringify(local))

  try {
    const remote = await callEdgeFunction('bookings', {
      method: 'POST',
      query: { action: 'create-viewing' },
      body: request,
    })
    return { booking: remote || request, source: 'supabase' }
  } catch {
    return { booking: request, source: 'local' }
  }
}

export async function getBookingAvailability(payload = {}) {
  try {
    return await callEdgeFunction('bookings', {
      query: {
        action: 'availability',
        listingId: payload.listingId,
        date: payload.date,
      },
      allowAnonymous: true,
    })
  } catch {
    return {
      slots: ['09:00', '10:30', '12:00', '14:00', '16:00'].map((time) => ({
        time,
        available: true,
      })),
      source: 'local',
    }
  }
}

export async function listViewingRequests() {
  try {
    return await callEdgeFunction('bookings', {
      query: { action: 'list' },
    })
  } catch {
    return getLocalBookings()
  }
}

export async function updateViewingRequestStatus(bookingId, status) {
  const next = getLocalBookings().map((booking) =>
    booking.id === bookingId ? { ...booking, status, updated_at: new Date().toISOString() } : booking
  )
  localStorage.setItem(BOOKING_KEY, JSON.stringify(next))

  try {
    return await callEdgeFunction('bookings', {
      method: 'PUT',
      query: { action: 'update-status' },
      body: { bookingId, status },
    })
  } catch {
    return next.find((booking) => booking.id === bookingId)
  }
}
