import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { notifyUser } from '../_shared/notifications.ts'
import {
  resolveListingAgent,
  upsertLeadFromViewing,
  ensureCalendarForViewing,
  logUserActivity,
} from '../_shared/agent-crm.ts'

const AGENT_ROLES = new Set(['agent', 'agency_owner', 'agency_manager', 'platform_admin'])

async function isAgent(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  return AGENT_ROLES.has(data?.role ?? '')
}

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

    if (req.method === 'GET' && action === 'agent_viewings') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)
      if (!(await isAgent(createAdminClient(), user.id))) {
        return errorResponse('Agent access required', 403)
      }

      const admin = createAdminClient()
      const { data } = await admin
        .from('viewing_requests')
        .select('*')
        .eq('agent_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .order('preferred_date', { ascending: true })
        .limit(50)

      return jsonResponse({ viewings: data ?? [], source: 'supabase' })
    }

    if (req.method === 'POST') {
      const user = await getUserFromRequest(req)
      if (!user) return errorResponse('Authentication required', 401)

      const body = await req.json()
      const admin = createAdminClient()

      if (body.action === 'create_viewing') {
        const agentId = await resolveListingAgent(admin, body.listing_id)
        const { data, error } = await admin
          .from('viewing_requests')
          .insert({
            listing_id: body.listing_id,
            user_id: user.id,
            preferred_date: body.preferred_date ?? null,
            guests: body.guests ?? 1,
            notes: body.notes ?? '',
            status: 'pending',
            agent_id: agentId,
          })
          .select('*')
          .single()

        if (error) {
          console.error('viewing insert failed', error.message)
          return jsonResponse({
            ok: true,
            queued: true,
            message: 'Viewing request recorded locally until database is ready.',
            request: { listing_id: body.listing_id, user_id: user.id, status: 'pending' },
          })
        }

        if (agentId) {
          const { data: listing } = await admin.from('listings').select('title').eq('id', body.listing_id).maybeSingle()
          const title = listing?.title ?? body.listing_id
          await upsertLeadFromViewing(admin, data, agentId, title)
          await logUserActivity(admin, user.id, {
            category: 'viewing',
            title: 'Viewing requested',
            body: title,
            link: '/trips',
          })
        }

        return jsonResponse({ ok: true, request: data })
      }

      if (body.action === 'update_viewing_status') {
        const status = body.status as string
        if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
          return errorResponse('Invalid status')
        }

        const { data: existing } = await admin
          .from('viewing_requests')
          .select('*')
          .eq('id', body.viewing_id)
          .maybeSingle()

        if (!existing) return errorResponse('Viewing not found', 404)

        const isOwner = existing.user_id === user.id
        const agent = await isAgent(admin, user.id)
        if (!isOwner && !agent) return errorResponse('Forbidden', 403)
        if (isOwner && status === 'confirmed') return errorResponse('Only agents can confirm', 403)

        const { data, error } = await admin
          .from('viewing_requests')
          .update({ status, agent_id: existing.agent_id ?? (await resolveListingAgent(admin, existing.listing_id)) })
          .eq('id', body.viewing_id)
          .select('*')
          .single()

        if (error) return errorResponse(error.message, 500)

        const { data: listing } = await admin.from('listings').select('title, submitted_by').eq('id', existing.listing_id).maybeSingle()
        const title = listing?.title || existing.listing_id
        const agentId = data.agent_id ?? listing?.submitted_by ?? null

        if (agentId && status === 'confirmed') {
          const leadId = await upsertLeadFromViewing(admin, data, agentId, title)
          await ensureCalendarForViewing(admin, data, agentId, title, leadId)
          await admin.from('agent_leads').update({ stage: 'viewing', updated_label: 'just now' }).eq('id', leadId)
        }

        await logUserActivity(admin, existing.user_id, {
          category: 'viewing',
          title: status === 'confirmed' ? 'Viewing confirmed' : status === 'cancelled' ? 'Viewing cancelled' : 'Viewing updated',
          body: `${title} · ${existing.preferred_date}`,
          link: '/trips',
        })
        await notifyUser(admin, {
          userId: existing.user_id,
          type: 'viewing',
          title: status === 'confirmed' ? 'Viewing confirmed' : status === 'cancelled' ? 'Viewing cancelled' : 'Viewing updated',
          body: `${title} · ${existing.preferred_date}`,
          link: '/trips',
        })

        return jsonResponse({ ok: true, request: data })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Unsupported request', 404)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
