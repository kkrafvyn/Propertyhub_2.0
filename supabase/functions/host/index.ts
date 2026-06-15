import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const { data: listings } = await admin.from('listings').select('id').or(`submitted_by.eq.${user.id},owner_id.eq.${user.id}`)
        const { data: reservations } = await admin.from('reservations').select('*').eq('host_id', user.id).gte('check_in', new Date().toISOString().slice(0, 10))
        const { data: payouts } = await admin.from('host_payouts').select('amount').eq('host_id', user.id).eq('status', 'paid')
        const monthlyEarnings = (payouts ?? []).reduce((s, p) => s + Number(p.amount), 0)
        return jsonResponse({
          stats: {
            listings: listings?.length ?? 0,
            upcomingReservations: reservations?.length ?? 0,
            monthlyEarnings,
            occupancyRate: 0,
          },
          source: 'supabase',
        })
      }

      if (action === 'reservations') {
        const { data } = await admin.from('reservations').select('*').eq('host_id', user.id).order('check_in', { ascending: true })
        return jsonResponse({ reservations: data ?? [], source: 'supabase' })
      }

      if (action === 'calendar') {
        const listingId = url.searchParams.get('listing_id')
        let q = admin.from('listing_availability').select('*')
        if (listingId) q = q.eq('listing_id', listingId)
        const { data } = await q
        return jsonResponse({ availability: data ?? [], source: 'supabase' })
      }

      if (action === 'payouts') {
        const { data } = await admin.from('host_payouts').select('*').eq('host_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ payouts: data ?? [], source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'update_reservation') {
        await admin.from('reservations').update({ status: body.status }).eq('id', body.reservation_id).eq('host_id', user.id)
        return jsonResponse({ ok: true })
      }

      if (body.action === 'save_availability') {
        const rows = (body.dates ?? []).map((d: { date: string; available?: boolean; price_override?: number }) => ({
          id: `av-${body.listing_id}-${d.date}`,
          listing_id: body.listing_id,
          date: d.date,
          available: d.available ?? true,
          price_override: d.price_override,
        }))
        if (rows.length) await admin.from('listing_availability').upsert(rows)
        return jsonResponse({ ok: true, count: rows.length })
      }

      if (body.action === 'ensure_profile') {
        await admin.from('host_profiles').upsert({ user_id: user.id, display_name: body.display_name ?? user.email?.split('@')[0] })
        return jsonResponse({ ok: true })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
