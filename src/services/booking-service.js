import { callEdgeFunction } from '../lib/edge-client'
import { fetchViewingsFromDb } from '../lib/supabase-db'
import { supabase } from '../lib/supabase'
import { addTrip, getTrips } from '../lib/trips-storage'

export async function requestViewing({ listingId, date, guests = 1, notes = '' }) {
  try {
    return await callEdgeFunction('bookings', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'create_viewing',
        listing_id: listingId,
        preferred_date: date,
        guests,
        notes,
      },
    })
  } catch {
    return addTrip({
      listing_id: listingId,
      preferred_date: date,
      guests,
      notes,
      source: 'local',
    })
  }
}

export async function getAvailability(listingId) {
  return callEdgeFunction('bookings', {
    allowAnonymous: true,
    query: { action: 'availability', listing_id: listingId },
  })
}

export async function fetchUserTrips() {
  try {
    const payload = await callEdgeFunction('bookings', {
      allowAnonymous: false,
      query: { action: 'list_viewings' },
    })
    const rows = payload?.trips ?? payload?.requests ?? []
    if (rows.length) return { trips: rows, source: 'supabase' }
  } catch {
    /* fall through */
  }

  if (supabase) {
    const { data } = await supabase.auth.getUser()
    const rows = await fetchViewingsFromDb(data.user?.id)
    if (rows?.length) return { trips: rows, source: 'supabase' }
  }

  return { trips: getTrips(), source: 'local' }
}

export default { requestViewing, getAvailability, fetchUserTrips }
