import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'

interface ActivityItem {
  id: string
  category: string
  title: string
  body?: string
  link?: string
  created_at: string
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'activity') {
    const items: ActivityItem[] = []

    const { data: logged } = await admin
      .from('user_activity_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    for (const row of logged ?? []) {
      items.push({
        id: row.id,
        category: row.category,
        title: row.title,
        body: row.body ?? undefined,
        link: row.link ?? undefined,
        created_at: row.created_at,
      })
    }

    const [
      { data: offers },
      { data: transactions },
      { data: reservations },
      { data: maintenance },
      { data: alerts },
    ] = await Promise.all([
      admin.from('offers').select('id, property, status, updated, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      admin.from('transactions').select('id, property, stage, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      admin.from('reservations').select('id, listing_id, status, check_in, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      admin.from('maintenance_requests').select('id, title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      admin.from('smart_alerts').select('id, title, type, read, created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    for (const o of offers ?? []) {
      items.push({
        id: `offer-${o.id}`,
        category: 'buy',
        title: `Offer — ${o.property}`,
        body: o.status,
        link: '/offers',
        created_at: o.created_at ?? o.updated,
      })
    }
    for (const t of transactions ?? []) {
      items.push({
        id: `tx-${t.id}`,
        category: 'buy',
        title: `Transaction — ${t.property}`,
        body: t.stage,
        link: '/transactions',
        created_at: t.created_at,
      })
    }
    for (const r of reservations ?? []) {
      items.push({
        id: `res-${r.id}`,
        category: 'stay',
        title: 'Reservation update',
        body: `${r.status} · check-in ${r.check_in ?? '—'}`,
        link: '/trips',
        created_at: r.created_at,
      })
    }
    for (const m of maintenance ?? []) {
      items.push({
        id: `mnt-${m.id}`,
        category: 'rent',
        title: m.title ?? 'Maintenance request',
        body: m.status,
        link: '/renter/maintenance',
        created_at: m.created_at,
      })
    }
    for (const a of alerts ?? []) {
      if (a.read) continue
      items.push({
        id: `alert-${a.id}`,
        category: 'smart',
        title: a.title,
        body: a.type,
        link: '/my-home',
        created_at: a.created_at,
      })
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return jsonResponse({ activity: items.slice(0, 30), source: 'supabase' })
  }

  if (action === 'home_stats') {
    const today = new Date().toISOString().slice(0, 10)
    const [{ count: alertCount }, { data: energy }, { count: visitorPasses }] = await Promise.all([
      admin.from('smart_alerts').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('read', false),
      admin.from('energy_readings').select('kwh').order('period', { ascending: false }).limit(1).maybeSingle(),
      admin.from('visitor_passes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    ])

    return jsonResponse({
      stats: {
        smartAlerts: alertCount ?? 0,
        energyToday: energy?.kwh ? `${energy.kwh} kWh` : null,
        activeVisitorPasses: visitorPasses ?? 0,
      },
      source: 'supabase',
    })
  }

  return errorResponse('Unsupported action', 404)
})
