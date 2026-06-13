import { callEdgeFunction } from '../lib/edge-client'
import { createViewingRequestInDb, fetchViewingSlotsFromDb, fetchViewingsFromDb } from '../lib/supabase-db'
import { supabase } from '../lib/supabase'
import { addTrip, getTrips } from '../lib/trips-storage'

export async function requestViewing({ listingId, date, guests = 1, notes = '', slotId = null }) {
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
        slot_id: slotId,
      },
    })
  } catch {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const row = await createViewingRequestInDb({
          userId: user.id,
          listingId,
          date,
          guests,
          notes: slotId ? `${notes} Slot: ${slotId}`.trim() : notes,
        })
        if (row) return { ok: true, request: row, source: 'supabase' }
      }
    }
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
  try {
    const payload = await callEdgeFunction('bookings', {
      allowAnonymous: true,
      query: { action: 'availability', listing_id: listingId },
    })
    if (payload?.slots) return { slots: payload.slots, source: payload.source || 'supabase' }
  } catch {
    /* direct */
  }

  const rows = await fetchViewingSlotsFromDb(listingId)
  if (rows?.length) return { slots: rows, source: 'supabase' }

  return { slots: [], source: 'local' }
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
