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
      if (action === 'list') {
        const { data: memberships } = await admin
          .from('organization_members')
          .select('role, organizations(*)')
          .eq('user_id', user.id)
        const organizations = (memberships ?? []).map((m) => ({ ...m.organizations, memberRole: m.role }))
        return jsonResponse({ organizations, source: 'supabase' })
      }

      const orgId = url.searchParams.get('org_id')
      if (!orgId) return errorResponse('org_id required', 400)

      if (action === 'members') {
        const { data } = await admin.from('organization_members').select('*').eq('org_id', orgId)
        return jsonResponse({ members: data ?? [], source: 'supabase' })
      }

      if (action === 'permissions') {
        const { data } = await admin.from('organization_permissions').select('*').eq('org_id', orgId)
        return jsonResponse({ permissions: data ?? [], source: 'supabase' })
      }

      if (action === 'entities') {
        const { data } = await admin.from('organization_entities').select('*').eq('org_id', orgId)
        return jsonResponse({ entities: data ?? [], source: 'supabase' })
      }

      return errorResponse('Unsupported action', 404)
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'create') {
        const id = `org-${crypto.randomUUID().slice(0, 8)}`
        const slug = body.slug ?? body.name.toLowerCase().replace(/\s+/g, '-').slice(0, 32)
        await admin.from('organizations').insert({
          id,
          name: body.name,
          slug,
          country: body.country ?? 'GH',
          plan: body.plan ?? 'starter',
        })
        await admin.from('organization_members').insert({
          id: `om-${crypto.randomUUID().slice(0, 8)}`,
          org_id: id,
          user_id: user.id,
          role: 'owner',
          accepted_at: new Date().toISOString(),
        })
        return jsonResponse({ ok: true, organization: { id, name: body.name, slug } })
      }

      if (body.action === 'invite') {
        const row = {
          id: `om-${crypto.randomUUID().slice(0, 8)}`,
          org_id: body.org_id,
          user_id: user.id,
          role: body.role ?? 'member',
        }
        await admin.from('organization_members').upsert(row)
        return jsonResponse({ ok: true, invited: body.email })
      }
    }

    return errorResponse('Method not allowed', 405)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
