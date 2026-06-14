import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getUserFromRequest } from '../_shared/supabase.ts'
import { ensureDeveloperData } from '../_shared/user-seed.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const user = await getUserFromRequest(req)
  if (!user) return errorResponse('Authentication required', 401)

  const admin = createAdminClient()
  await ensureDeveloperData(admin, user.id)

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'dashboard') {
    const { data: projects } = await admin.from('developer_projects').select('*').eq('owner_id', user.id)
    const unitsTotal = projects?.reduce((s, p) => s + (p.units ?? 0), 0) ?? 0
    const unitsSold = projects?.reduce((s, p) => s + (p.sold ?? 0), 0) ?? 0
    return jsonResponse({
      profile: {
        name: 'Anchorstone Developments', activeProjects: projects?.length ?? 0,
        unitsTotal, unitsSold, constructionProgress: `${Math.round((unitsSold / Math.max(unitsTotal, 1)) * 100)}%`,
      },
      source: 'supabase',
    })
  }

  if (action === 'projects') {
    const { data } = await admin.from('developer_projects').select('*').eq('owner_id', user.id)
    return jsonResponse({ projects: data ?? [], source: 'supabase' })
  }

  if (action === 'construction') {
    const { data: projects } = await admin.from('developer_projects').select('id').eq('owner_id', user.id)
    const ids = projects?.map((p) => p.id) ?? []
    const { data } = await admin.from('developer_milestones').select('*').in('project_id', ids)
    const milestones = (data ?? []).map((r) => ({
      id: r.id, projectId: r.project_id, title: r.title, status: r.status, due: r.due_date,
    }))
    return jsonResponse({ milestones, source: 'supabase' })
  }

  if (action === 'buyers') {
    const { data: projects } = await admin.from('developer_projects').select('id').eq('owner_id', user.id)
    const ids = projects?.map((p) => p.id) ?? []
    const { data } = await admin.from('developer_buyers').select('*').in('project_id', ids)
    return jsonResponse({ buyers: data ?? [], source: 'supabase' })
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
