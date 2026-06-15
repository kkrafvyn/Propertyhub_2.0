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
    if (req.method === 'GET' && action === 'list') {
      const { data } = await admin.from('user_capabilities').select('capability').eq('user_id', user.id)
      return jsonResponse({ capabilities: (data ?? []).map((r) => r.capability), source: 'supabase' })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'grant') {
        const targetId = body.user_id ?? user.id
        const row = {
          user_id: targetId,
          capability: body.capability,
          granted_by: user.id,
          metadata: body.metadata ?? {},
        }
        const { error } = await admin.from('user_capabilities').upsert(row, { onConflict: 'user_id,capability' })
        if (error) return errorResponse(error.message, 400)
        return jsonResponse({ ok: true })
      }
    }

    return errorResponse('Unsupported action', 404)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unexpected error', 500)
  }
})
