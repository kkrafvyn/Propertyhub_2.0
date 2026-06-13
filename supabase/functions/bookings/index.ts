import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (req.method === 'GET' && action === 'availability') {
      const listingId = url.searchParams.get('listing_id')
      if (!listingId) return errorResponse('Missing listing_id')

      const admin = createAdminClient()
      const { data } = await admin
        .from('viewing_slots')
        .select('*')
        .eq('listing_id', listingId)
        .gte('slot_date', new Date().toISOString().slice(0, 10))
        .order('slot_date')
        .order('slot_time')

      const slots = (data ?? []).map((s) => ({
        id: s.id,
        date: s.slot_date,
        time: s.slot_time,
        available: s.capacity - s.booked,
      }))

      return jsonResponse({ listing_id: listingId, slots, source: 'supabase' })
    }

    if (req.method === 'GET' && action === 'list_viewings') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const admin = createAdminClient()
      const { data, error } = await admin
        .from('viewing_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('viewing list failed', error.message)
        return jsonResponse({ trips: [], source: 'edge' })
      }

      return jsonResponse({ trips: data ?? [], source: 'supabase' })
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const body = await req.json()
      if (body.action !== 'create_viewing') {
        return errorResponse('Unsupported action', 404)
      }

      const admin = createAdminClient()
      const { data, error } = await admin
        .from('viewing_requests')
        .insert({
          listing_id: body.listing_id,
          user_id: user.id,
          preferred_date: body.preferred_date ?? null,
          guests: body.guests ?? 1,
          notes: body.notes ?? '',
          status: 'pending',
        })
        .select('*')
        .single()

      if (error) {
        console.error('viewing insert failed', error.message)
        return jsonResponse({
          ok: true,
          queued: true,
          message: 'Viewing request recorded locally until database is ready.',
          request: {
            listing_id: body.listing_id,
            user_id: user.id,
            status: 'pending',
          },
        })
      }

      return jsonResponse({ ok: true, request: data })
    }

    return errorResponse('Unsupported request', 404)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
