import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { resolveStayType, resolveUtilitiesMode, buildUtilityAccountRow } from '../_shared/utilities.ts'
import { persistModuleActivation } from '../_shared/booking-modules.ts'
import { emitPlatformEvent } from '../_shared/events.ts'
import { runEventAutomations } from '../_shared/event-automation.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'availability') {
        const listingId = url.searchParams.get('listing_id')
        if (!listingId) return errorResponse('listing_id required', 400)
        const { data } = await admin.from('listing_availability').select('*').eq('listing_id', listingId).eq('available', true)
        return jsonResponse({ availability: data ?? [], source: 'supabase' })
      }

      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const role = url.searchParams.get('as') ?? action
      if (role === 'host') {
        const { data } = await admin.from('reservations').select('*').eq('host_id', user.id).order('check_in')
        return jsonResponse({ reservations: data ?? [], source: 'supabase' })
      }

      const { data } = await admin.from('reservations').select('*').eq('guest_id', user.id).order('check_in')
      return jsonResponse({ reservations: data ?? [], source: 'supabase' })
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      const body = await req.json()

      if (body.action === 'create') {
        const { data: listing } = await admin.from('listings').select('id, price, submitted_by, owner_id').eq('id', body.listing_id).maybeSingle()
        if (!listing) return errorResponse('Listing not found', 404)

        const hostId = listing.owner_id ?? listing.submitted_by
        const propertyId = body.property_id ?? body.listing_id
        const stayType = resolveStayType(body.check_in, body.check_out)
        const utilitiesMode = resolveUtilitiesMode(stayType)
        const id = `res-${crypto.randomUUID().slice(0, 8)}`
        const row = {
          id,
          listing_id: body.listing_id,
          property_id: propertyId,
          guest_id: user.id,
          host_id: hostId,
          check_in: body.check_in,
          check_out: body.check_out,
          status: 'pending',
          total: body.total ?? listing.price ?? 0,
          guests: body.guests ?? 1,
          stay_type: stayType,
          utilities_mode: utilitiesMode,
        }
        const { error } = await admin.from('reservations').insert(row)
        if (error) return errorResponse(error.message, 400)
        await admin.from('reservation_events').insert({
          id: `re-${crypto.randomUUID().slice(0, 8)}`,
          reservation_id: id,
          event_type: 'created',
          payload: { stay_type: stayType, utilities_mode: utilitiesMode },
        })

        let utilityAccount = null
        const { modules } = await persistModuleActivation(admin, {
          bookingType: 'reservation',
          bookingId: id,
          stayType,
          checkIn: body.check_in,
          checkOut: body.check_out,
        })

        if (modules.utility_account) {
          const accountRow = buildUtilityAccountRow({
            userId: user.id,
            propertyId,
            reservationId: id,
            utilitiesMode,
          })
          const { error: uaErr } = await admin.from('utility_accounts').insert(accountRow)
          if (!uaErr) utilityAccount = accountRow
        }

        await emitPlatformEvent(admin, {
          eventType: 'booking.created',
          aggregateType: 'reservation',
          aggregateId: id,
          actorId: user.id,
          payload: { stay_type: stayType, utilities_mode: utilitiesMode, listing_id: body.listing_id },
          idempotencyKey: `booking-created-${id}`,
        })
        await runEventAutomations(admin, {
          eventType: 'booking.created',
          userId: user.id,
          payload: { utilities_mode: utilitiesMode, stay_type: stayType },
        })
        await emitPlatformEvent(admin, {
          eventType: 'booking.modules_activated',
          aggregateType: 'reservation',
          aggregateId: id,
          actorId: user.id,
          payload: modules,
          idempotencyKey: `booking-modules-${id}`,
        })

        return jsonResponse({
          ok: true,
          reservation: row,
          utility_account: utilityAccount,
          utilities_included: utilitiesMode === 'inclusive',
          modules,
        })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
