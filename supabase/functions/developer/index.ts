import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureDeveloperData } from '../_shared/user-seed.ts'
import { logUserActivity } from '../_shared/agent-crm.ts'

function mapProject(p: Record<string, unknown>) {
  const progress = Number(p.progress ?? 0)
  return {
    ...p,
    completion: `${progress}%`,
    progress,
  }
}

function mapMilestone(r: Record<string, unknown>) {
  return {
    id: r.id,
    projectId: r.project_id,
    project: r.project_id,
    title: r.title,
    milestone: r.title,
    status: r.status,
    due: r.due_date,
    date: r.due_date,
  }
}

function mapBuyer(r: Record<string, unknown>) {
  return {
    ...r,
    project: r.project_id,
    stage: r.status,
    paid: r.paid_pct ?? 0,
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureDeveloperData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (req.method === 'POST') {
    const body = await req.json()

    if (body.action === 'create_project') {
      const id = `dp-${crypto.randomUUID().slice(0, 8)}`
      const row = {
        id,
        owner_id: user.id,
        name: body.name,
        location: body.location ?? '',
        units: Number(body.units ?? 0),
        sold: 0,
        status: body.status ?? 'pre_sale',
        progress: 0,
        listing_id: body.listing_id ?? null,
      }
      if (!row.name) return errorResponse('name required', 400)
      await admin.from('developer_projects').insert(row)
      return jsonResponse({ ok: true, project: mapProject(row) })
    }

    if (body.action === 'update_unit_status') {
      const { data: unit } = await admin.from('developer_units').select('*').eq('id', body.unit_id).maybeSingle()
      if (!unit) return errorResponse('Unit not found', 404)
      const { data: project } = await admin.from('developer_projects').select('owner_id, sold, units, id').eq('id', unit.project_id).maybeSingle()
      if (!project || project.owner_id !== user.id) return errorResponse('Forbidden', 403)

      await admin.from('developer_units').update({ status: body.status }).eq('id', body.unit_id)

      if (body.status === 'sold') {
        await admin.from('developer_projects').update({
          sold: Math.min(Number(project.units), Number(project.sold ?? 0) + 1),
        }).eq('id', project.id)
      }
      return jsonResponse({ ok: true })
    }

    if (body.action === 'notify_milestone') {
      const milestone = body.milestone ?? body
      const projectId = milestone.projectId ?? milestone.project_id
      const { data: ms } = await admin
        .from('developer_milestones')
        .select('*')
        .eq('id', milestone.id)
        .maybeSingle()
      if (ms) {
        await admin.from('developer_milestones').update({ buyer_notified_at: new Date().toISOString() }).eq('id', ms.id)
      }

      const { data: buyers } = await admin.from('developer_buyers').select('*').eq('project_id', projectId)
      let notified = 0
      for (const buyer of buyers ?? []) {
        if (buyer.buyer_user_id) {
          await logUserActivity(admin, buyer.buyer_user_id, {
            category: 'developer',
            title: `Construction update — ${milestone.title ?? milestone.milestone}`,
            body: String(milestone.status ?? ms?.status ?? 'updated'),
            link: '/developer/buyers',
          })
          notified += 1
        }
      }
      return jsonResponse({ ok: true, notified, source: 'supabase' })
    }

    if (body.action === 'link_buyer_transaction') {
      if (!body.buyer_id || !body.transaction_id) return errorResponse('buyer_id and transaction_id required', 400)
      await admin.from('developer_buyers').update({
        transaction_id: body.transaction_id,
        offer_id: body.offer_id ?? null,
        status: 'under_contract',
      }).eq('id', body.buyer_id)
      return jsonResponse({ ok: true })
    }

    return errorResponse('Unsupported action', 404)
  }

  if (action === 'dashboard') {
    const { data: projects } = await admin.from('developer_projects').select('*').eq('owner_id', user.id)
    const unitsTotal = projects?.reduce((s, p) => s + (p.units ?? 0), 0) ?? 0
    const unitsSold = projects?.reduce((s, p) => s + (p.sold ?? 0), 0) ?? 0
    const { data: profile } = await admin.from('user_profiles').select('display_name, full_name').eq('id', user.id).maybeSingle()
    const name = profile?.display_name ?? profile?.full_name ?? 'Developer'

    return jsonResponse({
      profile: {
        name,
        activeProjects: projects?.length ?? 0,
        unitsTotal,
        unitsSold,
        constructionProgress: `${Math.round((unitsSold / Math.max(unitsTotal, 1)) * 100)}%`,
      },
      source: 'supabase',
    })
  }

  if (action === 'projects') {
    const { data } = await admin.from('developer_projects').select('*').eq('owner_id', user.id)
    return jsonResponse({ projects: (data ?? []).map(mapProject), source: 'supabase' })
  }

  if (action === 'construction') {
    const { data: projects } = await admin.from('developer_projects').select('id, name').eq('owner_id', user.id)
    const ids = projects?.map((p) => p.id) ?? []
    const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]))
    const { data } = await admin.from('developer_milestones').select('*').in('project_id', ids)
    const milestones = (data ?? []).map((r) => ({
      ...mapMilestone(r),
      project: nameById[r.project_id] ?? r.project_id,
    }))
    return jsonResponse({ milestones, source: 'supabase' })
  }

  if (action === 'buyers') {
    const { data: projects } = await admin.from('developer_projects').select('id, name').eq('owner_id', user.id)
    const ids = projects?.map((p) => p.id) ?? []
    const nameById = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]))
    const { data } = await admin.from('developer_buyers').select('*').in('project_id', ids)
    const buyers = (data ?? []).map((r) => ({ ...mapBuyer(r), project: nameById[r.project_id] ?? r.project_id }))
    return jsonResponse({ buyers, source: 'supabase' })
  }

  if (action === 'units') {
    const projectId = url.searchParams.get('project_id')
    let q = admin.from('developer_units').select('*')
    if (projectId) q = q.eq('project_id', projectId)
    const { data: projects } = await admin.from('developer_projects').select('id').eq('owner_id', user.id)
    const ids = projects?.map((p) => p.id) ?? []
    if (ids.length) q = q.in('project_id', ids)
    const { data } = await q.order('unit_number')
    return jsonResponse({ units: data ?? [], source: 'supabase' })
  }

  return errorResponse('Unsupported action', 404)
})
