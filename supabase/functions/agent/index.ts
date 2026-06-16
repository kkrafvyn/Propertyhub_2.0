import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureAgentData } from '../_shared/user-seed.ts'
import { scoreLeadWithAi, persistLeadScore } from '../_shared/lead-scoring.ts'

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
        const [{ count: leads }, { count: viewings }, { count: listings }, { data: commissions }] = await Promise.all([
          admin.from('agent_leads').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
          admin.from('agent_calendar').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).eq('event_type', 'viewing'),
          admin.from('listings').select('*', { count: 'exact', head: true }).eq('submitted_by', user.id),
          admin.from('commission_settlements').select('amount, status').eq('agent_id', user.id),
        ])
        const pipeline = (commissions ?? [])
          .filter((c) => c.status === 'pending')
          .reduce((s, c) => s + Number(c.amount ?? 0), 0)
        const closed = (commissions ?? []).filter((c) => c.status === 'paid').length
        const totalLeads = leads ?? 0
        const conversionRate = totalLeads > 0 ? `${Math.round((closed / totalLeads) * 100)}%` : '0%'

        return jsonResponse({
          stats: {
            activeListings: listings ?? 0,
            leadsThisWeek: totalLeads,
            viewingsScheduled: viewings ?? 0,
            commissionPipeline: `GHS ${pipeline.toLocaleString()}`,
            conversionRate,
          },
          source: 'supabase',
        })
      }

      if (action === 'leads') {
        const { data } = await admin.from('agent_leads').select('*').eq('agent_id', user.id).order('created_at', { ascending: false })
        const leads = data ?? []
        for (const lead of leads) {
          if (lead.lead_score == null) {
            const scored = await scoreLeadWithAi(lead)
            await persistLeadScore(admin, lead.id, user.id, scored)
            lead.lead_score = scored.lead_score
            lead.score_factors = scored.score_factors
          }
        }
        return jsonResponse({ leads, source: 'supabase' })
      }

      if (action === 'score_leads') {
        const { data } = await admin.from('agent_leads').select('*').eq('agent_id', user.id)
        let updated = 0
        for (const lead of data ?? []) {
          const scored = await scoreLeadWithAi(lead)
          await persistLeadScore(admin, lead.id, user.id, scored)
          updated += 1
        }
        return jsonResponse({ ok: true, updated, source: 'supabase' })
      }

      if (action === 'calendar') {
        const { data } = await admin.from('agent_calendar').select('*').eq('agent_id', user.id).order('event_date')
        const events = (data ?? []).map((r) => ({
          id: r.id, title: r.title, date: r.event_date, time: r.event_time, type: r.event_type,
          listing_id: r.listing_id, viewing_request_id: r.viewing_request_id,
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
        const { data } = await admin.from('commission_settlements').select('*').eq('agent_id', user.id).order('created_at', { ascending: false })
        const commissions = (data ?? []).map((r) => ({
          id: r.id,
          settlementId: r.id,
          property: r.property,
          amount: Number(r.amount ?? 0),
          status: r.status,
          closed: r.closed_date ?? '—',
          transaction_id: r.transaction_id ?? null,
        }))
        return jsonResponse({ commissions, source: 'supabase' })
      }

      if (action === 'analytics') {
        const [{ count: leadCount }, { count: viewingCount }, { data: agentListings }, { data: topListing }] = await Promise.all([
          admin.from('agent_leads').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
          admin.from('viewing_requests').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
          admin.from('listings').select('id').eq('submitted_by', user.id),
          admin.from('listings').select('id, title, views').eq('submitted_by', user.id).order('views', { ascending: false }).limit(1).maybeSingle(),
        ])
        const listingIds = agentListings?.map((l) => l.id) ?? []
        let offerRows: { id: string; status: string }[] = []
        if (listingIds.length) {
          const { data: offers } = await admin.from('offers').select('id, status').in('listing_id', listingIds)
          offerRows = offers ?? []
        }
        const closeRate = leadCount && leadCount > 0
          ? `${Math.round((offerRows.filter((o) => o.status === 'accepted').length / leadCount) * 100)}%`
          : '0%'

        return jsonResponse({
          analytics: {
            listingViews: topListing?.views ?? 0,
            inquiries: leadCount ?? 0,
            viewings: viewingCount ?? 0,
            offers: offerRows.length,
            closeRate,
            avgDaysOnMarket: 18,
            topListing: topListing?.title ?? '—',
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
        const { data: prev } = await admin.from('agent_leads').select('*').eq('id', body.lead_id).eq('agent_id', user.id).maybeSingle()
        await admin.from('agent_leads').update({ stage: body.stage, updated_label: 'just now' }).eq('id', body.lead_id).eq('agent_id', user.id)
        if (prev && prev.stage !== body.stage) {
          await admin.from('lead_stage_history').insert({
            id: `lsh-${crypto.randomUUID().slice(0, 8)}`,
            lead_id: body.lead_id,
            agent_id: user.id,
            from_stage: prev.stage,
            to_stage: body.stage,
          }).catch(() => null)
        }
        if (prev) {
          const scored = await scoreLeadWithAi({ ...prev, stage: body.stage })
          await persistLeadScore(admin, body.lead_id, user.id, scored)
        }
        return jsonResponse({ ok: true })
      }

      if (body.action === 'create_lead') {
        const agentId = user.id
        let listingTitle = body.property ?? 'Property inquiry'
        if (body.listing_id) {
          const { data: listing } = await admin.from('listings').select('title').eq('id', body.listing_id).maybeSingle()
          if (listing?.title) listingTitle = listing.title
        }
        const leadId = `lead-${crypto.randomUUID().slice(0, 8)}`
        await admin.from('agent_leads').insert({
          id: leadId,
          agent_id: agentId,
          name: body.name ?? 'New lead',
          property: listingTitle,
          stage: body.stage ?? 'lead',
          value: Number(body.value ?? 0),
          updated_label: 'just now',
          listing_id: body.listing_id ?? null,
          buyer_user_id: body.buyer_user_id ?? null,
          source: body.source ?? 'manual',
          phone: body.phone ?? null,
          email: body.email ?? null,
        })
        const scored = await scoreLeadWithAi({
          id: leadId,
          name: body.name,
          property: listingTitle,
          stage: body.stage ?? 'lead',
          value: Number(body.value ?? 0),
          listing_id: body.listing_id ?? null,
          source: body.source ?? 'manual',
          phone: body.phone ?? null,
          email: body.email ?? null,
          buyer_user_id: body.buyer_user_id ?? null,
        })
        await persistLeadScore(admin, leadId, agentId, scored)
        return jsonResponse({ ok: true, lead_id: leadId, lead_score: scored.lead_score, score_factors: scored.score_factors })
      }

      return errorResponse('Unsupported action', 404)
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    console.error(error)
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
