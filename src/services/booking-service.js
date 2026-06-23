import { buildListingChatIntro } from '../lib/listing-links'
import {
  createViewingRequestInDb,
  fetchAgentViewingsFromDb,
  fetchViewingSlotsFromDb,
  fetchViewingsFromDb,
  updateViewingRequestStatusInDb,
  upsertUserProfileFromAuth,
} from '../lib/supabase-db'
import { supabase } from '../lib/supabase'
import { addTrip, getTrips, updateTripStatus } from '../lib/trips-storage'
import { sendSms } from './comms-service'
import { openListingConversation } from './messaging-service'

async function notifyViewingStatus({ userId, listingTitle, date, status }) {
  try {
    const { notifyUser } = await import('./notification-service')
    const titles = {
      confirmed: 'Viewing confirmed',
      cancelled: 'Viewing cancelled',
      completed: 'Viewing completed',
    }
    await notifyUser({
      userId,
      type: 'viewing',
      title: titles[status] || 'Viewing updated',
      body: `${listingTitle || 'Property'} · ${date}`,
      link: '/trips',
    })
  } catch {
    /* optional */
  }
}

export async function fetchListingSlotsForManage(listingId) {
  try {
    const payload = await callEdgeFunction('bookings', {
      allowAnonymous: false,
      query: { action: 'listing_slots', listing_id: listingId },
    })
    if (payload?.slots) return { slots: payload.slots, source: 'supabase' }
  } catch { /* */ }
  return { slots: [], source: 'local' }
}

export async function createViewingSlot({ listingId, slotDate, slotTime, slotType = 'viewing', capacity, notes }) {
  return callEdgeFunction('bookings', {
    method: 'POST',
    allowAnonymous: false,
    body: {
      action: 'create_slot',
      listing_id: listingId,
      slot_date: slotDate,
      slot_time: slotTime,
      slot_type: slotType,
      capacity,
      notes,
    },
  })
}

export async function deleteViewingSlot(slotId) {
  return callEdgeFunction('bookings', {
    method: 'POST',
    allowAnonymous: false,
    body: { action: 'delete_slot', slot_id: slotId },
  })
}

export async function requestViewing({ listingId, date, guests = 1, notes = '', slotId = null, preferredTime = null, listingTitle = '', hostName = '' }) {
  try {
    const result = await callEdgeFunction('bookings', {
      method: 'POST',
      allowAnonymous: false,
      body: {
        action: 'create_viewing',
        listing_id: listingId,
        preferred_date: date,
        guests,
        notes,
        slot_id: slotId,
        preferred_time: preferredTime,
      },
    })
    if (result?.ok !== false) {
      try {
        const { trackFunnel } = await import('../lib/analytics')
        trackFunnel('viewing_requested', { listing_id: listingId })
      } catch { /* */ }
    }
    return result
  } catch {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await upsertUserProfileFromAuth(user)
        const row = await createViewingRequestInDb({
          userId: user.id,
          listingId,
          date,
          guests,
          notes: slotId ? `${notes} Slot: ${slotId}`.trim() : notes,
        })
        if (row) {
          try {
            await openListingConversation({
              listingId,
              listingTitle: listingTitle || listingId,
              participantName: hostName || 'Property host',
              initialMessage: buildListingChatIntro({
                listingId,
                listingTitle: listingTitle || listingId,
                introLine: `Viewing request for ${date}${guests > 1 ? ` (${guests} guests)` : ''}.`,
              }),
            })
          } catch {
            /* messaging optional */
          }
          try {
            const { notifyCurrentUser } = await import('./notification-service')
            await notifyCurrentUser({
              type: 'viewing',
              title: 'Viewing request sent',
              body: `${listingTitle || listingId} · ${date}`,
              link: '/trips',
            })
            const { sendViewingConfirmation } = await import('./email-service')
            if (user.email) {
              await sendViewingConfirmation({ to: user.email, listingTitle: listingTitle || listingId, date })
            }
            const phone = user.user_metadata?.phone || user.phone
            if (phone) {
              await sendSms({
                phone,
                body: `BaytMiftah: Viewing request for ${listingTitle || listingId} on ${date}. Track in Trips.`,
                template: 'viewing_booked',
              })
            }
            const { trackFunnel } = await import('../lib/analytics')
            trackFunnel('viewing_requested', { listing_id: listingId })
          } catch {
            /* notifications optional */
          }
          return { ok: true, request: row, source: 'supabase' }
        }
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

export async function updateViewingStatus(viewingId, status, { listingTitle = '', date = '', userId = null } = {}) {
  try {
    const result = await callEdgeFunction('bookings', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'update_viewing_status', viewing_id: viewingId, status },
    })
    if (result?.ok !== false && userId) {
      await notifyViewingStatus({ userId, listingTitle, date, status })
    }
    return result
  } catch {
    const row = await updateViewingRequestStatusInDb(viewingId, status)
    if (row) {
      updateTripStatus(viewingId, status)
      if (userId) await notifyViewingStatus({ userId: row.user_id, listingTitle, date: row.preferred_date, status })
      return { ok: true, request: row, source: 'supabase' }
    }
    updateTripStatus(viewingId, status)
    return { ok: true, source: 'local' }
  }
}

export async function cancelViewing(viewingId) {
  return updateViewingStatus(viewingId, 'cancelled')
}

export async function confirmViewing(viewingId, meta = {}) {
  return updateViewingStatus(viewingId, 'confirmed', meta)
}

export async function fetchAgentViewings() {
  try {
    const payload = await callEdgeFunction('bookings', {
      allowAnonymous: false,
      query: { action: 'agent_viewings' },
    })
    if (payload?.viewings?.length) return { viewings: payload.viewings, source: 'supabase' }
  } catch { /* */ }
  const rows = await fetchAgentViewingsFromDb()
  if (rows?.length) return { viewings: rows, source: 'supabase' }
  return { viewings: [], source: 'local' }
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

export default {
  requestViewing,
  getAvailability,
  fetchUserTrips,
  cancelViewing,
  confirmViewing,
  updateViewingStatus,
  fetchAgentViewings,
  fetchListingSlotsForManage,
  createViewingSlot,
  deleteViewingSlot,
}
