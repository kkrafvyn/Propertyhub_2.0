import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureAgentData } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureAgentData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const [{ count: leads }, { count: viewings }] = await Promise.all([
          admin.from('agent_leads').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
          admin.from('agent_calendar').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).eq('event_type', 'viewing'),
        ])
        return jsonResponse({
          stats: {
            activeListings: 12,
            leadsThisWeek: leads ?? 0,
            viewingsScheduled: viewings ?? 0,
            commissionPipeline: 'GHS 142,000',
            conversionRate: '24%',
          },
          source: 'supabase',
        })
      }

      if (action === 'leads') {
        const { data } = await admin.from('agent_leads').select('*').eq('agent_id', user.id).order('created_at', { ascending: false })
        return jsonResponse({ leads: data ?? [], source: 'supabase' })
      }

      if (action === 'calendar') {
        const { data } = await admin.from('agent_calendar').select('*').eq('agent_id', user.id).order('event_date')
        const events = (data ?? []).map((r) => ({
          id: r.id, title: r.title, date: r.event_date, time: r.event_time, type: r.event_type,
        }))
        return jsonResponse({ calendar: events, source: 'supabase' })
      }

      if (action === 'tasks') {
        const { data } = await admin.from('agent_tasks').select('*').eq('agent_id', user.id).order('due_date')
        const tasks = (data ?? []).map((r) => ({
          id: r.id, title: r.title, due: r.due_date, priority: r.priority, done: r.done,
        }))
        return jsonResponse({ tasks, source: 'supabase' })
      }

      if (action === 'commissions') {
        const { data } = await admin.from('commission_settlements').select('*').eq('agent_id', user.id)
        const commissions = (data ?? []).map((r) => ({
          id: r.id, property: r.property, amount: r.amount, status: r.status, closed: r.closed_date ?? '—',
        }))
        return jsonResponse({ commissions, source: 'supabase' })
      }

      if (action === 'analytics') {
        return jsonResponse({
          analytics: {
            listingViews: 1842, inquiries: 47, viewings: 12, offers: 5,
            closeRate: '24%', avgDaysOnMarket: 18, topListing: 'Cantonments Sky Villa',
          },
          source: 'supabase',
        })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'toggle_task') {
        await admin.from('agent_tasks').update({ done: body.done }).eq('id', body.task_id).eq('agent_id', user.id)
        return jsonResponse({ ok: true })
      }
      if (body.action === 'update_lead_stage') {
        await admin.from('agent_leads').update({ stage: body.stage, updated_label: 'just now' }).eq('id', body.lead_id).eq('agent_id', user.id)
        return jsonResponse({ ok: true })
      }
      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
